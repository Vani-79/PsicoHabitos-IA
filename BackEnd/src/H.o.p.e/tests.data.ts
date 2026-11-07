export interface TestOption {
  value: number;
  label: string;
}

export interface TestItem {
  id: number;
  code: string;
  subscale?: string;
  statement: string;
  reversed?: boolean;
}

export interface PsychometricTest {
  id: string;
  name: string;
  shortName: string;
  targetClinicalArea: string;
  descriptionForSpecialist: string;
  instructionsPatient: string;
  scale: TestOption[];
  items: TestItem[];
  scoreCalculator: (answers: Record<number, number>) => {
    totalScore: number;
    subscales: Record<string, number>;
    clinicalReportSummary: string;
  };
}

export const PSYCHOMETRIC_TESTS: Record<string, PsychometricTest> = {
  'tas-20': {
    id: 'tas-20',
    name: 'Escala de Alexitimia de Toronto (TAS-20)',
    shortName: 'TAS-20',
    targetClinicalArea: 'Dificultad para identificar y describir emociones',
    descriptionForSpecialist: 'Evalúa alexitimia en 3 factores: Dificultad para identificar sentimientos, Dificultad para describir sentimientos y Pensamiento orientado al exterior.',
    instructionsPatient: 'A continuación te compartiré algunas afirmaciones sobre cómo experimentas tus emociones. Elige del 1 al 6 según qué tan de acuerdo estés.',
    scale: [
      { value: 1, label: 'Muy en desacuerdo' },
      { value: 2, label: 'En desacuerdo' },
      { value: 3, label: 'Ligeramente en desacuerdo' },
      { value: 4, label: 'Ligeramente de acuerdo' },
      { value: 5, label: 'De acuerdo' },
      { value: 6, label: 'Muy de acuerdo' }
    ],
    items: [
      { id: 1, code: 'AL1', subscale: 'F1_Identificar', statement: 'A menudo estoy confundido/a con las emociones que estoy sintiendo.' },
      { id: 2, code: 'AL2', subscale: 'F2_Describir', statement: 'Me es difícil encontrar las palabras correctas para expresar mis sentimientos.' },
      { id: 3, code: 'AL3', subscale: 'F1_Identificar', statement: 'Tengo sensaciones físicas que incluso ni los doctores entienden.' },
      { id: 4, code: 'AL4', subscale: 'F2_Describir', statement: 'Soy capaz de expresar mis sentimientos fácilmente.', reversed: true },
      { id: 5, code: 'AL5', subscale: 'F3_PensamientoExterno', statement: 'Prefiero pensar bien acerca de un problema en lugar de solo mencionarlo.', reversed: true },
      { id: 6, code: 'AL6', subscale: 'F1_Identificar', statement: 'Cuando me siento mal no sé si estoy triste, asustado/a o enojado/a.' },
      { id: 7, code: 'AL7', subscale: 'F1_Identificar', statement: 'A menudo estoy confundido/a con lo que siento en mi cuerpo.' },
      { id: 8, code: 'AL8', subscale: 'F3_PensamientoExterno', statement: 'Prefiero dejar que las cosas pasen solas, sin preguntarme por qué suceden así.' },
      { id: 9, code: 'AL9', subscale: 'F1_Identificar', statement: 'Tengo sentimientos que casi no puedo identificar.' },
      { id: 10, code: 'AL10', subscale: 'F3_PensamientoExterno', statement: 'Estar en contacto con las emociones es muy importante.', reversed: true },
      { id: 11, code: 'AL11', subscale: 'F2_Describir', statement: 'Me es difícil expresar lo que siento acerca de las personas.' },
      { id: 12, code: 'AL12', subscale: 'F2_Describir', statement: 'La gente me dice que exprese más mis sentimientos.' },
      { id: 13, code: 'AL13', subscale: 'F1_Identificar', statement: 'No sé qué pasa dentro de mí.' },
      { id: 14, code: 'AL14', subscale: 'F1_Identificar', statement: 'A menudo no sé por qué estoy enojado/a.' },
      { id: 15, code: 'AL15', subscale: 'F3_PensamientoExterno', statement: 'Prefiero hablar con la gente de sus actividades diarias mejor que de sus sentimientos.' },
      { id: 16, code: 'AL16', subscale: 'F3_PensamientoExterno', statement: 'Prefiero ver programas de TV simples pero entretenidos, que programas difíciles de entender.' },
      { id: 17, code: 'AL17', subscale: 'F2_Describir', statement: 'Me es difícil expresar mis sentimientos más profundos incluso a mis mejores amigos.' },
      { id: 18, code: 'AL18', subscale: 'F3_PensamientoExterno', statement: 'Puedo sentirme cercano/a a alguien, incluso en momentos de silencio.', reversed: true },
      { id: 19, code: 'AL19', subscale: 'F3_PensamientoExterno', statement: 'Encuentro útil examinar mis sentimientos para resolver problemas personales.', reversed: true },
      { id: 20, code: 'AL20', subscale: 'F3_PensamientoExterno', statement: 'Analizar y buscar significados profundos a películas o entretenimientos disminuye el placer de disfrutarlos.' }
    ],
    scoreCalculator: (answers) => {
      let total = 0;
      const subscales: Record<string, number> = {
        F1_Identificar: 0,
        F2_Describir: 0,
        F3_PensamientoExterno: 0
      };

      const reversedItems = [4, 5, 10, 18, 19];

      for (let i = 1; i <= 20; i++) {
        let val = answers[i] ?? 1;
        if (reversedItems.includes(i)) {
          val = 7 - val; // Escala 1..6 invertida
        }
        total += val;

        if ([1, 3, 6, 7, 9, 13, 14].includes(i)) subscales.F1_Identificar += val;
        else if ([2, 4, 11, 12, 17].includes(i)) subscales.F2_Describir += val;
        else subscales.F3_PensamientoExterno += val;
      }

      let clasificacion = 'Sin alexitimia';
      if (total >= 61) clasificacion = 'Alexitimia manifiesta (alta presencia)';
      else if (total >= 52) clasificacion = 'Alexitimia posible / intermedia';

      return {
        totalScore: total,
        subscales,
        clinicalReportSummary: `[TAS-20] Puntaje Total: ${total}/120 (${clasificacion}). Subescalas: F1 Identificar Emociones = ${subscales.F1_Identificar}, F2 Describir Emociones = ${subscales.F2_Describir}, F3 Pensamiento Externo = ${subscales.F3_PensamientoExterno}. Nota: Puntaje resguardado exclusivamente para el psicólogo según Código APA.`
      };
    }
  },

  'dass-21': {
    id: 'dass-21',
    name: 'Escala de Depresión, Ansiedad y Estrés (DASS-21)',
    shortName: 'DASS-21',
    targetClinicalArea: 'Sintomatología de depresión, ansiedad fisiológica y sobrecarga de estrés',
    descriptionForSpecialist: 'Evalúa presencia y severidad de estados emocionales negativos durante la última semana.',
    instructionsPatient: 'Indica en qué grado te ha ocurrido cada afirmación durante la última semana (del 0 al 3).',
    scale: [
      { value: 0, label: 'No me ha ocurrido' },
      { value: 1, label: 'Me ha ocurrido un poco, o parte del tiempo' },
      { value: 2, label: 'Me ha ocurrido bastante, o buena parte del tiempo' },
      { value: 3, label: 'Me ha ocurrido mucho, o la mayor parte del tiempo' }
    ],
    items: [
      { id: 1, code: 'D1', subscale: 'Estres', statement: 'Me ha costado mucho descargar la tensión.' },
      { id: 2, code: 'D2', subscale: 'Ansiedad', statement: 'Me di cuenta de que tenía la boca seca.' },
      { id: 3, code: 'D3', subscale: 'Depresion', statement: 'No podía sentir ningún sentimiento positivo.' },
      { id: 4, code: 'D4', subscale: 'Ansiedad', statement: 'Se me hizo difícil respirar.' },
      { id: 5, code: 'D5', subscale: 'Depresion', statement: 'Se me hizo difícil tomar la iniciativa para hacer cosas.' },
      { id: 6, code: 'D6', subscale: 'Estres', statement: 'Reaccioné exageradamente en ciertas situaciones.' },
      { id: 7, code: 'D7', subscale: 'Ansiedad', statement: 'Sentí que mis manos temblaban.' },
      { id: 8, code: 'D8', subscale: 'Estres', statement: 'He sentido que estaba gastando una gran cantidad de energía.' },
      { id: 9, code: 'D9', subscale: 'Ansiedad', statement: 'Estaba preocupado/a por situaciones en las cuales podía tener pánico o hacer el ridículo.' },
      { id: 10, code: 'D10', subscale: 'Depresion', statement: 'He sentido que no había nada que me ilusionara.' },
      { id: 11, code: 'D11', subscale: 'Estres', statement: 'Me he sentido inquieto/a.' },
      { id: 12, code: 'D12', subscale: 'Estres', statement: 'Se me hizo difícil relajarme.' },
      { id: 13, code: 'D13', subscale: 'Depresion', statement: 'Me sentí triste y deprimido/a.' },
      { id: 14, code: 'D14', subscale: 'Estres', statement: 'No toleré nada que me impidiera continuar con lo que estaba haciendo.' },
      { id: 15, code: 'D15', subscale: 'Ansiedad', statement: 'Sentí que estaba a punto de entrar en pánico.' },
      { id: 16, code: 'D16', subscale: 'Depresion', statement: 'No me pude entusiasmar por nada.' },
      { id: 17, code: 'D17', subscale: 'Depresion', statement: 'Sentí que valía muy poco como persona.' },
      { id: 18, code: 'D18', subscale: 'Estres', statement: 'He tendido a sentirme enfadado/a con facilidad.' },
      { id: 19, code: 'D19', subscale: 'Ansiedad', statement: 'Sentí los latidos de mi corazón a pesar de no haber hecho ningún esfuerzo físico.' },
      { id: 20, code: 'D20', subscale: 'Ansiedad', statement: 'Tuve miedo sin razón aparente.' },
      { id: 21, code: 'D21', subscale: 'Depresion', statement: 'Sentí que la vida no tenía ningún sentido.' }
    ],
    scoreCalculator: (answers) => {
      let dep = 0, ans = 0, est = 0;
      const depItems = [3, 5, 10, 13, 16, 17, 21];
      const ansItems = [2, 4, 7, 9, 15, 19, 20];
      const estItems = [1, 6, 8, 11, 12, 14, 18];

      depItems.forEach(i => dep += (answers[i] ?? 0));
      ansItems.forEach(i => ans += (answers[i] ?? 0));
      estItems.forEach(i => est += (answers[i] ?? 0));

      const getSeveridad = (p: number, r: number[]) => {
        if (p <= r[0]) return 'Normal';
        if (p <= r[1]) return 'Leve';
        if (p <= r[2]) return 'Moderado';
        if (p <= r[3]) return 'Severo';
        return 'Extremadamente Severo';
      };

      const sevDep = getSeveridad(dep, [4, 6, 10, 13]);
      const sevAns = getSeveridad(ans, [3, 4, 7, 9]);
      const sevEst = getSeveridad(est, [7, 9, 12, 16]);

      return {
        totalScore: dep + ans + est,
        subscales: { Depresion: dep, Ansiedad: ans, Estres: est },
        clinicalReportSummary: `[DASS-21] Depresión: ${dep} (${sevDep}), Ansiedad: ${ans} (${sevAns}), Estrés: ${est} (${sevEst}). Puntuación Global: ${dep + ans + est}. El paciente NO fue informado de estas etiquetas clínicas conforme a directrices de contención ética.`
      };
    }
  },

  'scl-90-r': {
    id: 'scl-90-r',
    name: 'Inventario de Síntomas SCL-90-R (Adaptación UBA / Casullo)',
    shortName: 'SCL-90-R',
    targetClinicalArea: 'Patrones multidimensionales de síntomas y distress psicológico',
    descriptionForSpecialist: 'Explora 9 dimensiones psicopatológicas primarias e índices globales de severidad en los últimos 7 días.',
    instructionsPatient: 'A continuación te consultaré sobre molestias o síntomas que pudiste haber sentido durante los últimos 7 días (del 0 al 4).',
    scale: [
      { value: 0, label: 'Nada' },
      { value: 1, label: 'Muy poco' },
      { value: 2, label: 'Poco' },
      { value: 3, label: 'Bastante' },
      { value: 4, label: 'Mucho' }
    ],
    items: [
      { id: 1, code: 'S1', subscale: 'Somatizacion', statement: 'Dolores de cabeza.' },
      { id: 2, code: 'S2', subscale: 'Ansiedad', statement: 'Nerviosismo o tensión interior.' },
      { id: 3, code: 'S3', subscale: 'Obsesiones', statement: 'Pensamientos desagradables que no se iban de mi cabeza.' },
      { id: 4, code: 'S4', subscale: 'Somatizacion', statement: 'Sensación de mareo o desmayo.' },
      { id: 5, code: 'S5', subscale: 'Adicional', statement: 'Falta de interés o energía general.' },
      { id: 6, code: 'S6', subscale: 'Hostilidad', statement: 'Sentirme irritable o con ganas de criticar a los demás.' },
      { id: 7, code: 'S7', subscale: 'Paranoide', statement: 'Sentir que otros no comprenden mis ideas o intenciones.' },
      { id: 8, code: 'S8', subscale: 'Sensibilidad', statement: 'Sentir que otros son culpables de lo que me pasa.' },
      { id: 9, code: 'S9', subscale: 'Obsesiones', statement: 'Tener dificultad para memorizar o concentrarme en cosas.' },
      { id: 10, code: 'S10', subscale: 'Depresion', statement: 'Estar preocupado/a por mi falta de ganas para hacer algo.' },
      { id: 11, code: 'S11', subscale: 'Hostilidad', statement: 'Sentirme enojado/a o malhumorado/a con facilidad.' },
      { id: 12, code: 'S12', subscale: 'Somatizacion', statement: 'Dolores o molestias en el pecho o espalda.' },
      { id: 13, code: 'S13', subscale: 'Fobia', statement: 'Miedo a los espacios muy concurridos o abiertos.' },
      { id: 14, code: 'S14', subscale: 'Depresion', statement: 'Sentirme con muy pocas energías para el día.' },
      { id: 15, code: 'S15', subscale: 'Depresion', statement: 'Pensamientos de desgano o desánimo profundo.' },
      { id: 16, code: 'S16', subscale: 'Psicoticismo', statement: 'Sentirme apartado/a o incomprendido/a por el entorno.' },
      { id: 17, code: 'S17', subscale: 'Ansiedad', statement: 'Temblores o sensación de inquietud motora.' },
      { id: 18, code: 'S18', subscale: 'Sensibilidad', statement: 'Sentirme fácilmente herido/a en mis sentimientos.' },
      { id: 19, code: 'S19', subscale: 'Adicional', statement: 'Poco apetito o alteraciones en mi comida habitual.' },
      { id: 20, code: 'S20', subscale: 'Depresion', statement: 'Llorar con facilidad o ganas de llorar.' }
    ],
    scoreCalculator: (answers) => {
      const keys = Object.keys(answers).map(Number);
      const total = keys.reduce((sum, k) => sum + (answers[k] ?? 0), 0);
      const respondedCount = keys.length || 1;
      const igs = (total / respondedCount).toFixed(2); // Índice de Severidad Global
      const tsp = keys.filter(k => (answers[k] ?? 0) > 0).length; // Total síntomas positivos

      return {
        totalScore: total,
        subscales: { IGS: Number(igs), TSP: tsp },
        clinicalReportSummary: `[SCL-90-R Parcial Clínico] IGS (Índice de Severidad Global): ${igs}, Total Síntomas Positivos (TSP): ${tsp}/${respondedCount}. Puntuación Bruta: ${total}. Diagnóstico reservado para revisión profesional del psicólogo titular.`
      };
    }
  }
};
