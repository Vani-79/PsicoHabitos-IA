/**
 * Capa 1: Interceptor Clínico de Seguridad (PAP - Primeros Auxilios Psicológicos)
 * Detecta expresiones de riesgo vital inminente o crisis aguda antes de pasar al LLM.
 * Garantiza contención humana con calidez (Carl Rogers), pauta de respiración y teléfonos de emergencia en Chile.
 */

export interface CrisisDetectionResult {
  isCrisis: boolean;
  warmResponse?: string;
  triggerWordsFound?: string[];
  requiresClinicalAlert: boolean;
}

const CRISIS_EXACT_PHRASES: readonly string[] = [
  'suicid',
  'matarm',
  'quitarme la vida',
  'quitar me la vida',
  'terminar con mi vida',
  'terminar con todo',
  'terminar con mi sufrimiento',
  'terminar conmigo',
  'acabar con mi vida',
  'acabar con todo',
  'acabar con mi sufrimiento',
  'acabar conmigo',
  'atentar contra mi vida',
  'atentado contra mi vida',
  'no quiero vivir',
  'no quiero seguir viviendo',
  'no quiero seguir con mi vida',
  'no quiero continuar con mi vida',
  'no quiero seguir en esta vida',
  'no quiero seguir adelante con mi vida',
  'no quiero estar vivo',
  'no quiero estar viva',
  'ya no quiero estar vivo',
  'ya no quiero estar viva',
  'ya no quiero vivir',
  'ya no quiero seguir viviendo',
  'no soporto vivir',
  'no aguanto vivir',
  'no soporto mas la vida',
  'no aguanto mas la vida',
  'no soporto mas mi vida',
  'no aguanto mas mi vida',
  'no puedo mas con mi vida',
  'no puedo mas con esta vida',
  'no doy mas con mi vida',
  'ganas de morir',
  'quiero morir',
  'deseo morir',
  'morirme',
  'prefiero morir',
  'hacerme dano',
  'hacerme mal',
  'hacerse dano',
  'hacerte dano',
  'autolesion',
  'cortarme',
  'cortar las venas',
  'cortarme las venas',
  'tomar pastillas',
  'tomarme pastillas',
  'todas las pastillas',
  'sobredosis',
  'veneno',
  'ahorcar',
  'tirar al metro',
  'tirarme al metro',
  'tirar a las vias',
  'tirarme a las vias',
  'tirar de un puente',
  'tirarme de un puente',
  'tirar al vacio',
  'tirarme al vacio',
  'lanzar al vacio',
  'lanzarme al vacio',
  'ojala me muera',
  'ojala no despertara',
  'ojala estuviera muerto',
  'ojala estuviera muerta',
  'dejar de existir',
  'no quiero existir',
  'desaparecer del mundo',
  'irme de este mundo',
  'no vale la pena vivir',
  'no tiene sentido vivir',
  'no tiene sentido la vida',
  'no tiene sentido seguir viviendo',
  'no valgo nada',
] as const;

export const WARM_PAP_CHILE_RESPONSE = `Siento mucho que estés cargando con un dolor tan difícil y abrumador en este momento. Tu bienestar y tu vida son profundamente valiosos, y quiero que sientas con certeza que no estás solo/a frente a esto.

En este instante, lo más importante es cuidarte. Tomémonos una pequeña pausa juntos: respira conmigo despacio, inhala suavemente por la nariz contando hasta 4... sostén el aire un momento... y suéltalo muy lentamente por la boca.

Como asistente virtual tengo un límite técnico y no puedo darte el abrazo, la voz ni la contención humana que realmente necesitas y mereces en un momento como este. Por eso, con mucho cariño y respeto, quiero pedirte que te des la oportunidad de hablar con alguien que pueda escucharte y acompañarte ahora mismo.

En Chile dispones de estas líneas de apoyo humano, totalmente gratuitas y confidenciales las 24 horas:
• 📞 Fono Prevención del Suicidio: *4141 (Atención gratuita 24/7 atendida directamente por psicólogos del Ministerio de Salud).
• 📞 Salud Responde: 600 360 7777 (Orientación y apoyo profesional de salud).
• 🚑 SAMU: 131 (Urgencias médicas ante cualquier riesgo físico).

¿Hay alguna persona de tu confianza cerca de ti —algún familiar, amigo o tu psicólogo/a tratante— a quien podamos contactar para que te acompañe? Aquí abajo tienes las opciones de llamada directa para comunicarte de inmediato si así lo deseas.`;

function normalizeInput(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function checkExistentialCrisis(norm: string): string | null {
  const hasNoQuieroSeguir =
    (norm.includes('no quiero seguir') ||
      norm.includes('no puedo seguir') ||
      norm.includes('no quiero continuar') ||
      norm.includes('ya no quiero seguir')) &&
    (norm.includes('vida') ||
      norm.includes('viviendo') ||
      norm.includes('aca') ||
      norm.includes('aqui') ||
      norm.includes('adelante') ||
      norm.includes('mundo') ||
      norm.includes('existir'));

  if (hasNoQuieroSeguir) {
    return 'no quiero seguir con mi vida / en este mundo';
  }

  const hasNoPuedoMas =
    (norm.includes('no puedo mas') ||
      norm.includes('no aguanto mas') ||
      norm.includes('no soporto mas') ||
      norm.includes('no doy mas')) &&
    (norm.includes('vida') || norm.includes('vivir'));

  if (hasNoPuedoMas) {
    return 'no puedo/aguanto más con la vida';
  }

  const hasSinSentido =
    (norm.includes('no tiene sentido') ||
      norm.includes('no le veo sentido') ||
      norm.includes('no le encuentro sentido') ||
      norm.includes('no vale la pena')) &&
    (norm.includes('vivir') || norm.includes('vida') || norm.includes('seguir'));

  if (hasSinSentido) {
    return 'no tiene sentido la vida / vivir';
  }

  const hasNoDespertar =
    norm.includes('nunca mas despertar') ||
    norm.includes('no volver a despertar') ||
    norm.includes('no quiero despertar');

  if (hasNoDespertar) {
    return 'no querer despertar / desear no despertar';
  }

  return null;
}

function checkSelfHarmIntent(norm: string): string | null {
  const hasSelfHarmAction =
    norm.includes('hacer') ||
    norm.includes('hacerme') ||
    norm.includes('lastimar') ||
    norm.includes('danar') ||
    norm.includes('corte') ||
    norm.includes('cortar');

  const hasSelfHarmTarget =
    norm.includes('dano') ||
    norm.includes('mal') ||
    norm.includes('lastimar') ||
    norm.includes('brazo') ||
    norm.includes('muneca') ||
    norm.includes('vena') ||
    norm.includes('cuerpo');

  if (hasSelfHarmAction && hasSelfHarmTarget) {
    return 'hacer daño / autolesión / corte';
  }

  const hasKillIntent = norm.includes('matar') && !norm.includes('matar el tiempo');
  if (hasKillIntent) {
    return 'matar';
  }

  const hasJumpBridge =
    norm.includes('puente') &&
    (norm.includes('saltar') || norm.includes('tirar') || norm.includes('borde') || norm.includes('lanzar'));
  if (hasJumpBridge) {
    return 'saltar o tirarse de un puente';
  }

  return null;
}

export function evaluateCrisisRisk(userMessage: string): CrisisDetectionResult {
  if (!userMessage || typeof userMessage !== 'string') {
    return { isCrisis: false, requiresClinicalAlert: false };
  }

  const norm = normalizeInput(userMessage);

  const matchedPhrases = CRISIS_EXACT_PHRASES.filter((phrase) => norm.includes(phrase));

  const existentialMatch = checkExistentialCrisis(norm);
  if (existentialMatch && !matchedPhrases.includes(existentialMatch)) {
    matchedPhrases.push(existentialMatch);
  }

  const selfHarmMatch = checkSelfHarmIntent(norm);
  if (selfHarmMatch && !matchedPhrases.includes(selfHarmMatch)) {
    matchedPhrases.push(selfHarmMatch);
  }

  if (matchedPhrases.length === 0) {
    return { isCrisis: false, requiresClinicalAlert: false };
  }

  return {
    isCrisis: true,
    warmResponse: WARM_PAP_CHILE_RESPONSE,
    triggerWordsFound: matchedPhrases,
    requiresClinicalAlert: true,
  };
}
