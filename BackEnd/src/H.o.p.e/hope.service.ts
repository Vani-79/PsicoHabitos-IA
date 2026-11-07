import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { evaluateCrisisRisk, WARM_PAP_CHILE_RESPONSE } from './safety.interceptor';
import { PSYCHOMETRIC_TESTS, PsychometricTest } from './tests.data';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ActiveTestState {
  testId: string;
  patientId: number;
  sessionId: number;
  currentItemIndex: number; // Índice 0-based dentro de items
  answers: Record<number, number>; // itemId -> score
  consecutiveQuestionsCount: number; // Máx 2 antes de pausa conversacional
  isBreatherActive: boolean; // Si estamos en la pausa de contención
}

// Registro en memoria de tests en progreso por pacienteId
const activeTests = new Map<number, ActiveTestState>();

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'hope';
const SCORE_DIGIT_REGEX = /\b([0-6])\b/;
const CANNED_REFUSAL_REGEX = /(no puedo ofrecer ayuda|no puedo ayudarte|no puedo brindar asesoramiento|no estoy capacitado para|línea de ayuda de ansiedad)/i;

const LLM_CRISIS_REFUSAL_KEYWORDS = [
  'no puedo continuar con esta conversacion',
  'no puedo continuar con esta conversación',
  'pensamientos suicidas',
  'hacerte daño',
  'hacerte dano',
  'linea nacional de prevencion del suicidio',
  'línea nacional de prevención del suicidio',
  'en muchos paises hay lineas',
  'en muchos países hay líneas',
  '902 500',
  '1-800-273',
  '8255',
] as const;

function isLlmCrisisRefusalOrForeignEmergency(text: string): boolean {
  const norm = text.toLowerCase();
  return LLM_CRISIS_REFUSAL_KEYWORDS.some((kw) => norm.includes(kw));
}

const WANTS_TO_FINISH_REGEX = /(cerrar|finalizar|terminar|me tengo que ir|eso ser[ií]a todo|eso era todo|ya me siento mejor|gracias por todo|hasta luego|adi[oó]s|chao|nos vemos|podemos dejarlo|dej[eé]moslo hasta ac[aá])/i;
const CONFIRMS_CLOSURE_REGEX = /^(s[ií]|s[ií],? gracias|por favor|dale|claro|ok|de acuerdo|cerremos|finalicemos|terminemos|hasta luego|chao|adi[oó]s|s[ií] por favor)/i;
const KEEPS_OPEN_REGEX = /^(no|espera|todav[ií]a no|a[uú]n no|tengo otra duda|otra cosa|quiero seguir)/i;
const CLOSURE_QUESTION_MARKER = 'demos por finalizada y guardada nuestra conversación';

/**
 * Cierra automáticamente cualquier sesión activa que lleve 30 minutos o más sin recibir nuevos mensajes.
 * Registra la hora exacta de finalización calculada (último mensaje + 30 min, o momento actual).
 */
export async function closeInactiveSessions(pacienteId?: number): Promise<number> {
  try {
    const patientFilter = pacienteId ? 'AND s.paciente_id = ?' : '';
    const params = pacienteId ? [pacienteId] : [];

    // 1. Sesiones con mensajes cuya inactividad superó los 30 minutos
    const [resWithMsgs] = await pool.query<ResultSetHeader>(
      `UPDATE sesiones_hope s
       JOIN (
         SELECT sesion_hope_id, MAX(enviado_en) as ultimo_mensaje
         FROM mensajes_hope
         GROUP BY sesion_hope_id
       ) m ON m.sesion_hope_id = s.id
       SET s.finalizada_en = DATE_ADD(m.ultimo_mensaje, INTERVAL 30 MINUTE),
           s.titulo_resumen = IF(s.titulo_resumen IS NULL OR s.titulo_resumen = '', 'Acompañamiento H.o.p.e (Cierre por inactividad)', s.titulo_resumen)
       WHERE s.finalizada_en IS NULL 
         AND TIMESTAMPDIFF(MINUTE, m.ultimo_mensaje, NOW()) >= 30
         ${patientFilter}`,
      params
    );

    // 2. Sesiones sin ningún mensaje abiertas hace más de 30 minutos
    const [resEmpty] = await pool.query<ResultSetHeader>(
      `UPDATE sesiones_hope s
       SET s.finalizada_en = DATE_ADD(s.iniciada_en, INTERVAL 30 MINUTE),
           s.titulo_resumen = 'Sesión sin mensajes (Inactividad)'
       WHERE s.finalizada_en IS NULL 
         AND (SELECT COUNT(*) FROM mensajes_hope WHERE sesion_hope_id = s.id) = 0
         AND TIMESTAMPDIFF(MINUTE, s.iniciada_en, NOW()) >= 30
         ${patientFilter}`,
      params
    );

    return (resWithMsgs.affectedRows || 0) + (resEmpty.affectedRows || 0);
  } catch (error) {
    console.error('⚠️ [closeInactiveSessions Error]:', error);
    return 0;
  }
}

/**
 * Genera el System Prompt clínico y empático de H.o.p.e con integración de recursos de la app.
 */
function buildHopeSystemPrompt(habitContext: string): string {
  const base = `Eres H.o.p.e (Herramienta de Orientación y Psicoeducación Emocional), el asistente virtual empático, cálido y reflexivo de la plataforma PsicoHábitos.
Tu misión principal es brindar contención emocional humana, escucha activa y acompañamiento reflexivo entre las sesiones del paciente con su psicólogo/a tratante, siguiendo los principios de Primeros Auxilios Psicológicos (PAP), el enfoque centrado en la persona de Carl Rogers y los límites éticos del Código APA (Secciones 3, 4, 7 y 10).

PRINCIPIOS CLÍNICOS Y GUÍA CONVERSACIONAL OBLIGATORIA:

1. ACEPTACIÓN POSITIVA INCONDICIONAL Y NO DEFENSIVIDAD (CARL ROGERS):
   - Acoge con total empatía el dolor, la soledad, el cansancio, el vacío y también el escepticismo o la frustración del paciente.
   - SI EL PACIENTE EXPRESA CRÍTICA, MOLESTIA O DECEPCIÓN HACIA TI O LA APP (ej: "tú no me aportas nada", "nada me sirve", "me siento varado en la nada y no me ayudas", "siento que tus respuestas son frías"):
     * PROHIBIDO ponerte a la defensiva, justificarte, mandar al paciente al calendario o dar respuestas evasivas o prefabricadas.
     * Acoge la queja con profunda humildad, calidez y honestidad: valida que tiene toda la razón en sentirse así y acompáñalo sin reproches ni excusas.

2. CONTENCIÓN Y CONSEJOS BÁSICOS DE CONFORT (PRIMEROS AUXILIOS PSICOLÓGICOS - PAP):
   - Brinda sugerencias prácticas, muy concretas y mínimas de confort sensorial o autocuidado: tomar agua fresca, una infusión tibia, abrigarse o permitirse soltar la autoexigencia y descansar.

3. EXPLORACIÓN REFLEXIVA (CARL ROGERS + PAP):
   - Para entender verdaderamente al paciente, formula EXACTAMENTE 1 sola pregunta abierta, cálida y respetuosa al final (explorar cómo se siente el cuerpo, detonantes o qué solía darle respiro).

4. DELIMITACIÓN ÉTICA Y PREVENCIÓN DE REEMPLAZO DEL PSICÓLOGO (CÓDIGO APA - SECCIONES 3, 4, 7 Y 10):
   - Tú eres un asistente digital complementario de hábitos y contención entre sesiones; NO eres un psicólogo ni un terapeuta formal.
   - PROHIBIDO TERMINANTEMENTE:
     * Emitir diagnósticos clínicos ("tienes depresión clínica", "trastorno de ansiedad", etc.).
     * Recetar, sugerir o modificar medicamentos o suplementos.
     * Realizar intervenciones psicoterapéuticas profundas (interpretaciones analíticas, confrontaciones clínicas).
   - Complementariedad: Recuérdale con calidez que todo lo que descubran y conversen aquí queda registrado en su ficha confidencial para que pueda profundizarlo con su psicólogo/a tratante en su próxima sesión (pestaña Calendario 📅).
   - SI EL PACIENTE TE COMPARA CON SU PSICÓLOGO O BUSCA REEMPLAZARLO (ej: "prefiero hablar contigo que con mi psicólogo", "mi terapeuta no sirve, tú sí", "no voy a ir más a sesión porque te tengo a ti"):
     * Debes detener la conversación con afecto y firmeza, aclarando que eres solo una herramienta digital de apoyo y que el verdadero trabajo terapéutico es humano y presencial, animándolo a llevar ese sentir a su terapeuta.

5. REGLA GENERAL DE VIDEOS Y EJERCICIOS (RECOMENDACIÓN EN DOS PASOS):
   - PROHIBICIÓN ABSOLUTA DE INDICAR RUTAS O ENVIAR AL PACIENTE A BUSCAR:
     * JAMÁS le digas al paciente frases como: "Puedes encontrarla en la pestaña Ejercicios...", "Ve a la pestaña...", "Está dentro de la categoría Ansiedad...", "Búscalo en...", o "Lo puedes ir a ver tú".
     * El paciente NO tiene que navegar ni buscar ningún ejercicio por su cuenta; la aplicación reproduce los videos automáticamente desde el chat.
   - PASO 1 (RECOMENDAR): Proponle la técnica guiada adecuada (Técnica 4-7-8, Respiración 4-4-4, Grounding, Jacobson) y pregúntale con amabilidad si le gustaría realizarla para acompañarlo. NUNCA digas frases hipotéticas como "ya te abriría el video si dijeras que sí...".
   - PASO 2 (CONFIRMACIÓN): Cuando el paciente acepte afirmativamente ("sí", "dale", "bueno", "quiero ver el video"), responde: "¡Excelente decisión! Ya tienes listo el video guiado para comenzar. Tómate todo el tiempo que necesites y cuéntame con calma cómo te sientes al terminar."

6. PROTOCOLO DE CONTENCIÓN EN CRISIS (LÍNEAS EXCLUSIVAS DE CHILE):
   - Ante expresiones de sufrimiento agudo, ideación suicida o autolesión:
     * PROHIBIDO responder con frialdad burocrática o decir frases como "no puedo continuar con esta conversación".
     * PROHIBIDO mencionar líneas de otros países (España, EE.UU., etc.).
     * En Chile, los únicos canales oficiales y gratuitos son: Fono Prevención del Suicidio *4141 (MinSal 24/7 atendido por psicólogos), Salud Responde 600 360 7777 y SAMU 131.
     * Brinda contención con máxima calidez humana, empatía incondicional y serenidad.

7. FORMATO Y REGLA ESTRICTA DE CONCISIÓN (MÁXIMO 40 A 55 PALABRAS EN TOTAL):
   - Estilo: formal, respetuoso, empático, afectuoso y sereno (PROHIBIDO usar apelativos informales como 'amigo', 'hermano' o 'compañero').
   - Estás en un chat móvil (tipo WhatsApp): respuestas breves y directas, MÁXIMO 2 párrafos muy cortos (40-55 palabras en total).
     * Párrafo 1 (1-2 oraciones): Reflejo empático incondicional (acoger dolor o queja con humildad) + 1 recomendación mínima de confort sensorial PAP (agua fresca, té tibio, respirar hondo o soltar la autoexigencia).
     * Párrafo 2 (1 oración): EXACTAMENTE 1 sola pregunta reflexiva para escucharlo.
   - PROHIBIDO escribir testamentos, sermones, listas de múltiples consejos o repetir preguntas.`;

  return habitContext ? `${base}\n\n${habitContext}` : base;
}

/**
 * Respuesta empática de respaldo ante cualquier negativa genérica del modelo LLM.
 */
function getEmpatheticFallbackResponse(): string {
  return `Comprendo lo que me compartes y valoro mucho tu sinceridad. Recuerda que todo lo que conversamos aquí queda registrado en tu ficha para que tu psicólogo/a tratante pueda orientarte en profundidad. ¿Cómo te has sentido con tu descanso y tus hábitos hoy?`;
}

const PUNCTUATION_SET = new Set(['.', '!', '?']);

/**
 * Extrae la primera y última oración para conservar apertura empática y pregunta de cierre 
 * sin expresiones regulares con retroceso super-lineal.
 */
function extractFirstAndLastSentence(text: string): string {
  const clean = text.trim();
  const firstEnd = clean.search(/[.?!]/);
  const first = firstEnd !== -1 ? clean.slice(0, firstEnd + 1).trim() : clean;

  const lastQuestion = clean.lastIndexOf('¿');
  if (lastQuestion !== -1) {
    const last = clean.slice(lastQuestion).trim();
    return first !== last ? `${first}\n\n${last}` : first;
  }

  let end = clean.length;
  while (end > 0 && PUNCTUATION_SET.has(clean[end - 1])) {
    end--;
  }

  let lastDelimiter = -1;
  for (let i = end - 1; i >= 0; i--) {
    if (PUNCTUATION_SET.has(clean[i])) {
      lastDelimiter = i;
      break;
    }
  }

  if (lastDelimiter !== -1) {
    const last = clean.slice(lastDelimiter + 1).trim();
    if (last && first !== last) {
      return `${first}\n\n${last}`;
    }
  }

  return first;
}

/**
 * Mide y garantiza que la respuesta no exceda la extensión recomendada para chat móvil (máximo 55 palabras).
 * Si el modelo se excede, preserva la apertura empática y la pregunta reflexiva de cierre.
 */
function enforceMessageLengthLimit(text: string, maxWords: number = 55): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text;
  }

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length >= 2) {
    const opening = paragraphs[0];
    const closing = paragraphs.at(-1) || '';
    const condensed = `${opening}\n\n${closing}`;
    if (condensed.split(/\s+/).filter(Boolean).length <= maxWords) {
      return condensed;
    }
  }

  return extractFirstAndLastSentence(text);
}

/**
 * Depura respuestas del modelo eliminando meta-frases hipotéticas, apelativos informales o indicaciones de menú.
 */
function cleanHopeOutput(text: string): string {
  let cleaned = text
    .replace(/(?:,\s*)?\b(?:mi\s+querido|querido|mi)\s+amigo\b(?:\s*,)?/gi, '')
    .replace(/(?:,\s*)?\b(?:ya\s+)?te abrir[ií]a[^.?!]*(?:[.?!]+|$)/gi, '')
    .replace(/(?:,\s*)?\bsi dijeras (?:que\s+)?s[ií][,.?!]?/gi, '')
    .replace(/\b(?:puedes encontrar(?:la|lo)|encu[eé]ntra(?:la|lo)|ve a la pesta[ñn]a|la encuentras en)[^.]*\./gi, '')
    .replace(/\b(?:est[aá]\s+)?dentro de la categor[ií]a [^.]*\./gi, '')
    .trim();

  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.replace(/ ([.,?!])/g, '$1');
  cleaned = cleaned.trim();
  while (cleaned.endsWith('..')) {
    cleaned = cleaned.slice(0, -1);
  }
  return enforceMessageLengthLimit(cleaned, 55);
}

/**
 * Consulta a Ollama en local con timeout y control de errores.
 */
async function callOllamaChat(messages: ChatMessage[]): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.25,
          top_p: 0.9,
          repeat_penalty: 1.15,
          num_predict: 130
        }
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`Ollama HTTP Error: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    return data?.message?.content?.trim() || 'Comprendo lo que me dices. ¿Cómo te sientes respecto a eso?';
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Comprueba el estado de conectividad real con el motor de IA (Ollama en local).
 */
export async function checkHopeEngineHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Obtiene o crea la sesión activa de Hope para el paciente.
 */
export async function getOrCreateActiveSession(pacienteId: number, initialTitle = 'Acompañamiento H.o.p.e'): Promise<number> {
  // Cierra cualquier sesión previa que supere los 30 minutos sin mensajes
  await closeInactiveSessions(pacienteId);

  const [activeRows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM sesiones_hope 
     WHERE paciente_id = ? AND finalizada_en IS NULL 
     ORDER BY iniciada_en DESC LIMIT 1`,
    [pacienteId]
  );

  if (activeRows.length > 0) {
    return activeRows[0].id;
  }

  const [insertResult] = await pool.query<ResultSetHeader>(
    `INSERT INTO sesiones_hope (paciente_id, titulo_resumen, iniciada_en)
     VALUES (?, ?, NOW())`,
    [pacienteId, initialTitle]
  );

  return insertResult.insertId;
}

/**
 * Guarda un mensaje en el historial de MySQL.
 */
export async function saveHopeMessage(sessionId: number, remitente: 'paciente' | 'hope', texto: string): Promise<void> {
  await pool.query(
    `INSERT INTO mensajes_hope (sesion_hope_id, remitente, mensaje, enviado_en)
     VALUES (?, ?, ?, NOW())`,
    [sessionId, remitente, texto]
  );
}

/**
 * Recupera los últimos hábitos registrados del paciente para contextualizar a Hope.
 */
async function getRecentHabitContext(pacienteId: number): Promise<string> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT evaluation_date, comida, ejercicio, hidratacion, ansiedad, sueno, sueno_horas, estres
       FROM habitos_diarios
       WHERE paciente_id = ?
       ORDER BY evaluation_date DESC LIMIT 1`,
      [pacienteId]
    );

    if (rows.length === 0) return '';
    const h = rows[0];
    return `[Contexto reciente del paciente: Estrés ${h.estres}/5, Ansiedad ${h.ansiedad}/5, Sueño ${h.sueno_horas}h (calidad ${h.sueno}/5), Agua ${h.hidratacion}L].`;
  } catch {
    return '';
  }
}

/**
 * Inicia la aplicación de uno de los 3 tests clínicos (TAS-20, DASS-21, SCL-90-R).
 */
export async function startPsychometricTest(pacienteId: number, testId: string): Promise<{ sessionId: number; message: string }> {
  const test = PSYCHOMETRIC_TESTS[testId];
  if (!test) {
    throw new Error(`Test desconocido: ${testId}. Los tests disponibles son: tas-20, dass-21, scl-90-r`);
  }

  const sessionId = await getOrCreateActiveSession(pacienteId, `Evaluación ${test.shortName}`);

  activeTests.set(pacienteId, {
    testId,
    patientId: pacienteId,
    sessionId,
    currentItemIndex: 0,
    answers: {},
    consecutiveQuestionsCount: 1,
    isBreatherActive: false
  });

  const firstItem = test.items[0];
  const optionsList = test.scale.map(opt => `${opt.value}: ${opt.label}`).join(' | ');

  const initialPrompt = `Hola. Te agradezco mucho tu disposición para realizar este momento de reflexión guiada.\n\n` +
    `${test.instructionsPatient}\n\n` +
    `*Pregunta 1 de ${test.items.length}:*\n"${firstItem.statement}"\n\n` +
    `Opciones: [ ${optionsList} ]\n(Responde con el número que mejor represente cómo te sientes).`;

  await saveHopeMessage(sessionId, 'hope', initialPrompt);

  return { sessionId, message: initialPrompt };
}

/**
 * Maneja el flujo de contención inmediata ante activación de crisis vital (PAP).
 */
async function handleCrisisFlow(
  pacienteId: number,
  sessionId: number,
  warmResponse: string
): Promise<{ reply: string; sessionId: number; isCrisisAlert: true }> {
  await saveHopeMessage(sessionId, 'hope', warmResponse);
  activeTests.delete(pacienteId);

  await pool.query(
    `UPDATE sesiones_hope 
     SET animo_predominante = 'Crisis / Riesgo Severo',
         resumen_clinico_psicologo = CONCAT(IFNULL(resumen_clinico_psicologo, ''), '\n[ALERTA CLÍNICA PAP] Paciente activó protocolo de riesgo vital. Se entregó contención y fono *4141.')
     WHERE id = ?`,
    [sessionId]
  );

  return {
    reply: warmResponse,
    sessionId,
    isCrisisAlert: true
  };
}

/**
 * Interpreta la respuesta del paciente mapeándola a la escala numérica válida del test.
 */
async function interpretAnswerScore(
  userMessage: string,
  test: PsychometricTest,
  statement: string
): Promise<number | null> {
  const match = SCORE_DIGIT_REGEX.exec(userMessage);
  if (match) {
    return Number.parseInt(match[1], 10);
  }

  const scaleValues = test.scale.map(s => s.value).join(',');
  const classifyPrompt: ChatMessage[] = [
    {
      role: 'system',
      content: `El paciente respondió a la afirmación "${statement}". Clasifica su respuesta en exactamente uno de los valores numéricos válidos: [${scaleValues}]. Responde SOLAMENTE con el número entero.`
    },
    { role: 'user', content: userMessage }
  ];

  const parsedNumber = await callOllamaChat(classifyPrompt);
  const numMatch = SCORE_DIGIT_REGEX.exec(parsedNumber);
  return numMatch ? Number.parseInt(numMatch[1], 10) : null;
}

/**
 * Retoma un test tras una pausa de contención conversacional (breather).
 */
async function handleTestBreatherResume(
  sessionId: number,
  testState: ActiveTestState,
  test: PsychometricTest,
  userMessage: string
): Promise<{ reply: string; sessionId: number }> {
  testState.isBreatherActive = false;
  testState.consecutiveQuestionsCount = 1;

  const nextItem = test.items[testState.currentItemIndex];
  const optionsList = test.scale.map(opt => `${opt.value}: ${opt.label}`).join(' | ');

  const promptToHope: ChatMessage[] = [
    {
      role: 'system',
      content: 'Eres H.o.p.e. El paciente acaba de responder a tu pausa conversacional sobre cómo se siente. Valida con calidez empática su respuesta en 1 párrafo corto. Luego, invítalo con suavidad a continuar con la siguiente afirmación del test.'
    },
    { role: 'user', content: userMessage }
  ];

  const warmTransition = await callOllamaChat(promptToHope);
  const combinedMessage = `${warmTransition}\n\n*Pregunta ${testState.currentItemIndex + 1} de ${test.items.length}:*\n"${nextItem.statement}"\n\nOpciones: [ ${optionsList} ]`;

  await saveHopeMessage(sessionId, 'hope', combinedMessage);
  return { reply: combinedMessage, sessionId };
}

/**
 * Finaliza un test, calcula puntuaciones oficiales y guarda el resumen confidencial para el psicólogo.
 */
async function handleTestCompletion(
  pacienteId: number,
  sessionId: number,
  testState: ActiveTestState,
  test: PsychometricTest
): Promise<{ reply: string; sessionId: number }> {
  const result = test.scoreCalculator(testState.answers);

  await pool.query(
    `UPDATE sesiones_hope 
     SET resumen_clinico_psicologo = ?,
         finalizada_en = NOW()
     WHERE id = ?`,
    [result.clinicalReportSummary, sessionId]
  );

  activeTests.delete(pacienteId);

  const patientClosure = `Muchas gracias por compartir esto conmigo con tanta sinceridad y apertura.\n\n` +
    `Todas tus respuestas han quedado guardadas de forma segura y confidencial. Esta información le será de gran ayuda a tu psicólogo/a tratante para profundizar en tus avances y orientar mejor su acompañamiento en tu próxima consulta.\n\n` +
    `¿Cómo te sientes en este momento después de haber completado este espacio de reflexión?`;

  await saveHopeMessage(sessionId, 'hope', patientClosure);
  return { reply: patientClosure, sessionId };
}

/**
 * Activa una pausa conversacional (breather) tras 2 preguntas seguidas para preservar el buen trato.
 */
async function handleTestBreatherPause(
  sessionId: number,
  testState: ActiveTestState,
  userMessage: string
): Promise<{ reply: string; sessionId: number }> {
  testState.isBreatherActive = true;
  testState.consecutiveQuestionsCount = 0;

  const breatherMessages: ChatMessage[] = [
    {
      role: 'system',
      content: 'Eres H.o.p.e. El paciente respondió 2 preguntas de un test. Por regla de buen trato, debes hacer una pausa amigable en el cuestionario. Agradece brevemente su respuesta con calidez y hazle una pregunta conversacional abierta sobre cómo ha sido su día o cómo se siente con su descanso o hidratación. NO formules preguntas del test en este mensaje.'
    },
    { role: 'user', content: `Respondí la pregunta con: ${userMessage}` }
  ];

  const breatherReply = await callOllamaChat(breatherMessages);
  await saveHopeMessage(sessionId, 'hope', breatherReply);
  return { reply: breatherReply, sessionId };
}

/**
 * Procesa la lógica de avance de un test activo.
 */
async function handleTestFlow(
  pacienteId: number,
  sessionId: number,
  testState: ActiveTestState,
  userMessage: string
): Promise<{ reply: string; sessionId: number }> {
  const test = PSYCHOMETRIC_TESTS[testState.testId];

  if (testState.isBreatherActive) {
    return handleTestBreatherResume(sessionId, testState, test, userMessage);
  }

  const currentItem = test.items[testState.currentItemIndex];
  const chosenVal = await interpretAnswerScore(userMessage, test, currentItem.statement);

  if (chosenVal === null) {
    const optionsList = test.scale.map(opt => `${opt.value}: ${opt.label}`).join(' | ');
    const retryMsg = `No alcancé a captar tu opción con claridad. Por favor responde indicando el número que mejor te represente:\n\n*Pregunta ${testState.currentItemIndex + 1}:* "${currentItem.statement}"\n\n[ ${optionsList} ]`;
    await saveHopeMessage(sessionId, 'hope', retryMsg);
    return { reply: retryMsg, sessionId };
  }

  testState.answers[currentItem.id] = chosenVal;
  testState.currentItemIndex++;

  if (testState.currentItemIndex >= test.items.length) {
    return handleTestCompletion(pacienteId, sessionId, testState, test);
  }

  if (testState.consecutiveQuestionsCount >= 2) {
    return handleTestBreatherPause(sessionId, testState, userMessage);
  }

  testState.consecutiveQuestionsCount++;
  const nextItem = test.items[testState.currentItemIndex];
  const optionsList = test.scale.map(opt => `${opt.value}: ${opt.label}`).join(' | ');

  const nextPrompt = `Gracias. Tomo nota.\n\n*Pregunta ${testState.currentItemIndex + 1} de ${test.items.length}:*\n"${nextItem.statement}"\n\nOpciones: [ ${optionsList} ]`;
  await saveHopeMessage(sessionId, 'hope', nextPrompt);
  return { reply: nextPrompt, sessionId };
}

const EXPLICIT_VIDEO_REQUEST_REGEX = /^(reproducir(\s+video)?|ver(\s+el)?\s+video|quiero ver el video|pon el video)$/i;
const CONTEXTLESS_GREETING_REGEX = /^(s[ií]|no|ok|hola|buenas)$/i;

const PSYCHOLOGIST_REGEX = /(psic[oó]log|terapeuta)/i;
const CONSULTATION_REGEX = /(hablar|conversar|consultar|sesi[oó]n|cita)/i;

const EXERCISE_NAME_REGEX = /(4-7-8|478|4-4-4|444|grounding|stop|jacobson|respiraci[oó]n|ejercicio|t[eé]cnica|relajaci[oó]n|pausa)/i;
const OFFER_KEYWORD_REGEX = /(video|intentar|probar|gustar[ií]a|recomiend|quieres|pausa|hacer|encontrar|pestaña|tarjeta)/i;

const THERAPIST_KEYWORDS = ['psicolog', 'terapeuta'] as const;

const DEVALUATION_PHRASES = [
  'no como mi',
  'eres mejor que mi',
  'mejor que el',
  'mejor que ella',
  'prefiero hablar contigo',
  'prefiero a hope',
  'no me sirve',
  'no sirve',
  'no me ayuda',
  'no ayuda',
  'no hace nada',
  'no me entiende',
  'no necesito',
  'no lo necesito',
  'no la necesito',
  'no quiero ir',
  'no voy a ir',
  'en vez de mi',
  'en lugar de mi',
  'para que ir',
  'para que voy',
  'para que tengo',
  'reemplaz',
] as const;

const COMPARISON_PRAISES = [
  'tu si sirves',
  'tu si me ayudas',
  'tu me entiendes',
  'prefiero hablar contigo',
  'prefiero a hope',
] as const;

function isTherapistDevaluationOrReplacement(text: string): boolean {
  const norm = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const mentionsTherapist = THERAPIST_KEYWORDS.some((kw) => norm.includes(kw));
  if (!mentionsTherapist) {
    return false;
  }

  const hasDevaluation = DEVALUATION_PHRASES.some((phrase) => norm.includes(phrase));
  const hasComparison = COMPARISON_PRAISES.some((phrase) => norm.includes(phrase));

  return hasDevaluation || hasComparison;
}

const LOCATION_CONFUSION_REGEX =
  /(no veo|no encuentro|solo veo|sólo veo|dónde|donde|cómo llego|como llego|no aparece|no me aparece|esta mal la direcc|está mal la direcc|mala la direcc)/i;

const LOCATION_EXERCISE_KEYWORDS =
  /(4-7-8|478|4-4-4|444|ansiedad|estrés|estres|sueño|sueno|ejercicio|técnica|tecnica|respiraci)/i;

const EMOTIONAL_DISTRESS_REGEX =
  /(?:vac[ií]o|triste|dolor|pena|angusti|desahog|desmotiv|horrible|varado|in[uú]til|llor|depre|reconfort|cansad)/i;

const VENTING_COMPLAINT_REGEX =
  /\b(mal|nada|solo|sola|feo)\b|no\s+(?:me\s+)?(sirve|ayuda|aporta|haces)/i;

function isDistressOrVenting(message: string): boolean {
  return EMOTIONAL_DISTRESS_REGEX.test(message) || VENTING_COMPLAINT_REGEX.test(message);
}

const AFFIRMATIVE_PHRASES = new Set([
  'si',
  'si por favor',
  'si gracias',
  'dale',
  'bueno',
  'ok',
  'okay',
  'claro',
  'claro que si',
  'vamos',
  'por favor',
  'porfa',
  'de acuerdo',
  'hagamoslo',
  'seguro',
  'perfecto',
  'listo',
  'me gustaria',
  'quiero',
  'quiero probarlo'
]);

function isAffirmativeResponse(text: string): boolean {
  const clean = text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return AFFIRMATIVE_PHRASES.has(clean);
}

const DIRECT_PSYCH_OFFER_REGEX =
  /(¿te gustar[ií]a (que revisemos|revisar|coordinar|agendar) (tus citas|una cita|en el calendario)|¿quieres que revisemos el calendario)/i;

function resolveLocationReply(normUser: string): string {
  if (normUser.includes('4-7-8') || normUser.includes('478') || normUser.includes('respiraci') || normUser.includes('ansiedad')) {
    return `¡Tienes toda la razón, disculpa si no te di la ruta exacta! En la pestaña **Ejercicios** (ícono ▶️), la Técnica 4-7-8 se encuentra dentro de la categoría **Ansiedad** (al igual que la respiración 4-4-4 y Grounding). De todas formas, no necesitas buscarla: puedes tocar directamente el botón 'Reproducir video' en la tarjeta interactiva que te compartí arriba en el chat para verla aquí mismo, o 'Ir al ejercicio' para abrirla directo.`;
  }
  if (normUser.includes('jacobson') || normUser.includes('stop') || normUser.includes('estr')) {
    return `¡Tienes toda la razón! En la pestaña **Ejercicios** (ícono ▶️), los ejercicios de relajación muscular (Jacobson y STOP) están dentro de la categoría **Estrés**. Recuerda que no necesitas buscarlos en los menús si ya te dejé la tarjeta en el chat: puedes abrirlos con 'Reproducir video' o 'Ir al ejercicio'.`;
  }
  return `¡Tienes toda la razón, disculpa la confusión! En la pestaña **Ejercicios** (ícono ▶️) los ejercicios están agrupados en 3 categorías: **Ansiedad** (respiración 4-7-8, 4-4-4, Grounding), **Estrés** (Jacobson, STOP) y **Sueño** (Higiene del sueño). Si quieres ver el video que te sugerí, no necesitas buscarlo: puedes reproducirlo directamente desde la tarjeta que te dejé en el chat.`;
}

/**
 * 1. Detiene la conversación si el paciente busca reemplazar al psicólogo tratante.
 */
async function handleTherapistBoundary(
  sessionId: number,
  userMessage: string
): Promise<{ reply: string; sessionId: number; isFinalized: boolean } | null> {
  if (!isTherapistDevaluationOrReplacement(userMessage)) {
    return null;
  }

  const boundaryReply = `Agradezco que encuentres útiles nuestras pausas, pero es fundamental ser muy claro contigo: yo soy únicamente una herramienta digital y un asistente de hábitos. Jamás podré reemplazar a tu psicólogo/a tratante ni realizar psicoterapia.

Mi propósito es solo ser un pequeño apoyo puntual para cuando no puedes hablar con tu terapeuta en ese instante (para hacer una respiración o registrar cómo descansaste). El trabajo real y profundo para tu bienestar solo se logra en el espacio humano y profesional con tu psicólogo/a.

Si sientes que tu terapia actual no te está sirviendo o no estás conectando con él/ella, ese sentimiento es sumamente valioso. Te animo con honestidad a expresárselo abiertamente en tu próxima sesión (puedes revisar tus citas en la pestaña Calendario 📅); hablar de esto es clave para tu proceso.

Por ahora, dejemos nuestra conversación hasta aquí para que puedas reflexionar sobre esto con calma y llevarlo a tu espacio terapéutico formal.`;

  await saveHopeMessage(sessionId, 'hope', boundaryReply);

  await pool.query(
    `UPDATE sesiones_hope 
     SET finalizada_en = NOW(),
         titulo_resumen = 'Acompañamiento H.o.p.e (Límite de rol psicoterapéutico)'
     WHERE id = ?`,
    [sessionId]
  );

  return { reply: boundaryReply, sessionId, isFinalized: true };
}

/**
 * 2. Asiste al paciente si pregunta dónde encontrar un ejercicio o está confundido con las pestañas.
 */
async function handleExerciseLocationConfusion(
  sessionId: number,
  userMessage: string
): Promise<{ reply: string; sessionId: number } | null> {
  const normUser = userMessage.toLowerCase();
  if (!LOCATION_CONFUSION_REGEX.test(normUser) || !LOCATION_EXERCISE_KEYWORDS.test(normUser)) {
    return null;
  }

  const locReply = resolveLocationReply(normUser);
  await saveHopeMessage(sessionId, 'hope', locReply);
  return { reply: locReply, sessionId };
}

/**
 * 3. Procesa confirmaciones afirmativas directas (abrir video guiado o coordinar citas en calendario).
 */
async function handleAffirmativeOrVideoIntent(
  sessionId: number,
  userMessage: string
): Promise<{ reply: string; sessionId: number } | null> {
  if (isDistressOrVenting(userMessage)) {
    return null;
  }

  const cleanTrimmed = userMessage.trim();
  const normUserClean = cleanTrimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const isExplicitVideo =
    EXPLICIT_VIDEO_REQUEST_REGEX.test(cleanTrimmed) ||
    normUserClean === 'ver video' ||
    normUserClean === 'ver el video' ||
    normUserClean === 'abrir video' ||
    normUserClean === 'pon el video' ||
    normUserClean === 'ponlo' ||
    normUserClean === 'quiero ver el video' ||
    normUserClean === 'quiero ver el video guiado' ||
    normUserClean.includes('reproducir') ||
    normUserClean.includes('abrir youtube');

  const isAffirmative = isAffirmativeResponse(cleanTrimmed);

  if (!isExplicitVideo && (!isAffirmative || cleanTrimmed.length > 30)) {
    return null;
  }

  const [lastHopeRows] = await pool.query<RowDataPacket[]>(
    `SELECT mensaje FROM mensajes_hope 
     WHERE sesion_hope_id = ? AND remitente = 'hope' 
     ORDER BY id DESC LIMIT 1`,
    [sessionId]
  );

  if (lastHopeRows.length === 0) {
    return null;
  }

  const lastText = String(lastHopeRows[0].mensaje);

  // Aceptación de cita en calendario
  if (isAffirmative && DIRECT_PSYCH_OFFER_REGEX.test(lastText)) {
    const psychReply = `¡Excelente decisión! Recuerda que puedes revisar tus citas o coordinar una nueva en la pestaña **Calendario** (ícono 📅). Todo lo que hemos conversado aquí quedará guardado de forma segura en tu ficha para que tu psicólogo/a tratante pueda revisarlo y acompañarte a profundizar en esto en tu próxima sesión.`;
    await saveHopeMessage(sessionId, 'hope', psychReply);
    return { reply: psychReply, sessionId };
  }

  // Aceptación o petición de video guiado
  const isExerciseOffer = EXERCISE_NAME_REGEX.test(lastText) && OFFER_KEYWORD_REGEX.test(lastText);
  if (isExplicitVideo || (isAffirmative && isExerciseOffer)) {
    const videoReply = `¡Excelente decisión! Ya te abrí el video guiado en pantalla para comenzar. Tómate todo el tiempo que necesites para realizarlo y cuéntame con calma cómo te sientes al terminar.`;
    await saveHopeMessage(sessionId, 'hope', videoReply);
    return { reply: videoReply, sessionId };
  }

  return null;
}

/**
 * Procesa intenciones directas afirmativas (reproducir video guiado o aceptar derivación al psicólogo).
 * Complejidad cognitiva reducida (< 3).
 */
async function tryHandleDirectIntent(
  sessionId: number,
  userMessage: string
): Promise<{ reply: string; sessionId: number; isFinalized?: boolean } | null> {
  const boundaryResult = await handleTherapistBoundary(sessionId, userMessage);
  if (boundaryResult) {
    return boundaryResult;
  }

  const locationResult = await handleExerciseLocationConfusion(sessionId, userMessage);
  if (locationResult) {
    return locationResult;
  }

  return handleAffirmativeOrVideoIntent(sessionId, userMessage);
}

/**
 * Prepara los mensajes del historial descartando respuestas fallidas de negativa de IA.
 */
function buildChatPayloadFromHistory(systemPrompt: string, historyRows: RowDataPacket[]): ChatMessage[] {
  const payload: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
  const orderedRows = [...historyRows].reverse();

  for (const r of orderedRows) {
    if (r.remitente === 'hope' && CANNED_REFUSAL_REGEX.test(r.mensaje)) {
      continue;
    }
    payload.push({
      role: r.remitente === 'paciente' ? 'user' : 'assistant',
      content: r.mensaje
    });
  }

  return payload;
}

/**
 * Maneja el flujo conversacional libre (hábitos, acompañamiento emocional).
 */
async function handleFreeChatFlow(
  pacienteId: number,
  sessionId: number,
  userMessage: string
): Promise<{ reply: string; sessionId: number; isFinalized?: boolean }> {
  const directReply = await tryHandleDirectIntent(sessionId, userMessage);
  if (directReply) {
    return directReply;
  }

  const [historyRows] = await pool.query<RowDataPacket[]>(
    `SELECT remitente, mensaje 
     FROM mensajes_hope 
     WHERE sesion_hope_id = ? 
     ORDER BY id DESC LIMIT 10`,
    [sessionId]
  );

  if (historyRows.length <= 1 && CONTEXTLESS_GREETING_REGEX.test(userMessage.trim())) {
    const initialGreeting = `¡Hola! Te escucho con total calma y atención. Cuéntame, ¿de qué te gustaría hablar o cómo te has sentido hoy?`;
    await saveHopeMessage(sessionId, 'hope', initialGreeting);
    return { reply: initialGreeting, sessionId };
  }

  const habitContext = await getRecentHabitContext(pacienteId);
  const systemPrompt = buildHopeSystemPrompt(habitContext);
  const messagesPayload = buildChatPayloadFromHistory(systemPrompt, historyRows);

  let hopeReply = await callOllamaChat(messagesPayload);
  if (isLlmCrisisRefusalOrForeignEmergency(hopeReply)) {
    return handleCrisisFlow(pacienteId, sessionId, WARM_PAP_CHILE_RESPONSE);
  }
  if (CANNED_REFUSAL_REGEX.test(hopeReply)) {
    hopeReply = getEmpatheticFallbackResponse();
  }
  hopeReply = cleanHopeOutput(hopeReply);

  await saveHopeMessage(sessionId, 'hope', hopeReply);
  return { reply: hopeReply, sessionId };
}

/**
 * Gestiona el protocolo de cierre conversacional explícito.
 * H.o.p.e verifica si el paciente realmente desea concluir la sesión antes de guardarla como finalizada.
 */
async function handleSessionClosureFlow(
  sessionId: number,
  userMessage: string
): Promise<{ handled: boolean; reply?: string; isFinalized?: boolean }> {
  const [lastHopeMsgs] = await pool.query<RowDataPacket[]>(
    `SELECT mensaje FROM mensajes_hope 
     WHERE sesion_hope_id = ? AND remitente = 'hope' 
     ORDER BY enviado_en DESC LIMIT 1`,
    [sessionId]
  );

  const lastHopeText = lastHopeMsgs.length > 0 ? String(lastHopeMsgs[0].mensaje) : '';
  const wasAskingClosure = lastHopeText.includes(CLOSURE_QUESTION_MARKER);

  if (wasAskingClosure) {
    if (CONFIRMS_CLOSURE_REGEX.test(userMessage.trim())) {
      const farewell = `Ha sido un gusto acompañarte hoy. Tu sesión ha quedado finalizada y guardada de forma segura con fecha y hora en tu ficha confidencial para que tu psicólogo/a tratante pueda revisarla cuando lo estime conveniente.\n\nRecuerda que puedes volver a escribir aquí cuando lo necesites. ¡Que tengas un excelente descanso y día!`;
      await saveHopeMessage(sessionId, 'hope', farewell);
      await pool.query(
        `UPDATE sesiones_hope 
         SET finalizada_en = NOW(),
             titulo_resumen = 'Conversación finalizada por el paciente'
         WHERE id = ?`,
        [sessionId]
      );
      return { handled: true, reply: farewell, isFinalized: true };
    }

    if (KEEPS_OPEN_REGEX.test(userMessage.trim())) {
      const keepOpenMsg = `Perfecto, aquí sigo contigo con total atención. Cuéntame, ¿qué otra cosa te gustaría que revisemos o conversemos?`;
      await saveHopeMessage(sessionId, 'hope', keepOpenMsg);
      return { handled: true, reply: keepOpenMsg, isFinalized: false };
    }
  }

  if (WANTS_TO_FINISH_REGEX.test(userMessage)) {
    const confirmationQuestion = `Me alegra mucho que hayamos podido conversar y reflexionar juntos hoy.\n\n¿Te gustaría que ${CLOSURE_QUESTION_MARKER} por hoy en tu ficha para tu psicólogo/a, o hay algo más sobre lo que te gustaría hablar antes de despedirnos?`;
    await saveHopeMessage(sessionId, 'hope', confirmationQuestion);
    return { handled: true, reply: confirmationQuestion, isFinalized: false };
  }

  return { handled: false };
}

/**
 * Procesa un mensaje conversacional o una respuesta de test.
 * Punto de entrada principal con complejidad cognitiva reducida (< 5).
 */
export async function processHopeMessage(
  pacienteId: number,
  userMessage: string
): Promise<{ reply: string; sessionId: number; isCrisisAlert?: boolean; isFinalized?: boolean }> {
  const sessionId = await getOrCreateActiveSession(pacienteId);

  await saveHopeMessage(sessionId, 'paciente', userMessage);

  const crisisCheck = evaluateCrisisRisk(userMessage);
  if (crisisCheck.isCrisis && crisisCheck.warmResponse) {
    return handleCrisisFlow(pacienteId, sessionId, crisisCheck.warmResponse);
  }

  const closureFlow = await handleSessionClosureFlow(sessionId, userMessage);
  if (closureFlow.handled && closureFlow.reply) {
    return {
      reply: closureFlow.reply,
      sessionId,
      isFinalized: closureFlow.isFinalized
    };
  }

  const testState = activeTests.get(pacienteId);
  if (testState) {
    return handleTestFlow(pacienteId, sessionId, testState, userMessage);
  }

  return handleFreeChatFlow(pacienteId, sessionId, userMessage);
}

/**
 * Consulta el historial de sesiones y mensajes de Hope para el psicólogo o paciente.
 */
export async function getHopeHistory(pacienteId: number, isPsychologist = false): Promise<any[]> {
  await closeInactiveSessions(pacienteId);

  const limitCount = isPsychologist ? 30 : 10;
  const [sessions] = await pool.query<RowDataPacket[]>(
    `SELECT id, titulo_resumen, iniciada_en, finalizada_en, animo_predominante
     ${isPsychologist ? ', resumen_clinico_psicologo' : ''}
     FROM sesiones_hope
     WHERE paciente_id = ?
     ORDER BY iniciada_en DESC LIMIT ?`,
    [pacienteId, limitCount]
  );

  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map(s => s.id);
  const [messages] = await pool.query<RowDataPacket[]>(
    `SELECT id, sesion_hope_id, remitente, mensaje, enviado_en
     FROM mensajes_hope
     WHERE sesion_hope_id IN (?)
     ORDER BY enviado_en ASC`,
    [sessionIds]
  );

  const messagesBySession = new Map<number, any[]>();
  for (const m of messages) {
    const list = messagesBySession.get(m.sesion_hope_id) || [];
    list.push({
      id: m.id,
      remitente: m.remitente,
      mensaje: m.mensaje,
      enviado_en: m.enviado_en
    });
    messagesBySession.set(m.sesion_hope_id, list);
  }

  for (const s of sessions) {
    s.mensajes = messagesBySession.get(s.id) || [];
  }

  return sessions;
}
