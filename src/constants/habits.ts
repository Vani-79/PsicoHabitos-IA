import { HabitKey, HabitDefinition, RatingScaleItem, DailyHabitRatings } from '../types/habits';

/**
 * Escala única y centralizada de evaluación (1 al 5).
 * Fuente de verdad para valores, textos, colores y animaciones.
 */
export const RATING_SCALE: RatingScaleItem[] = [
  { value: 1, label: 'Muy mal', anxietyLabel: 'Muy intensa', stressLabel: 'Muy intenso', color: '#ef4444' },
  { value: 2, label: 'Mal', anxietyLabel: 'Intensa', stressLabel: 'Intenso', color: '#f97316' },
  { value: 3, label: 'Regular', anxietyLabel: 'Moderada', stressLabel: 'Moderado', color: '#eab308' },
  { value: 4, label: 'Bien', anxietyLabel: 'Leve', stressLabel: 'Leve', color: '#84cc16' },
  { value: 5, label: 'Muy bien', anxietyLabel: 'En calma', stressLabel: 'En calma', color: '#22c55e' },
];

export const UNRATED_COLOR = '#EFEFEF';
export const WATER_RATED_COLOR = '#2563EB';

/**
 * Obtiene el color de fondo para la tarjeta según el puntaje registrado.
 * Para el hábito de agua (hidratación), retorna un color azul neutro.
 */
export const getRatingColor = (rating: number | null, habitKey?: HabitKey | null): string => {
  if (rating === null) return UNRATED_COLOR;
  if (habitKey === 'hidratacion') return WATER_RATED_COLOR;
  const match = RATING_SCALE.find((item) => item.value === rating);
  return match ? match.color : UNRATED_COLOR;
};

/**
 * Devuelve la etiqueta correspondiente (conducta vs. ansiedad vs. estrés vs. litros de agua).
 */
export const getRatingLabel = (value: number, habitKey?: HabitKey | null): string => {
  if (habitKey === 'hidratacion') {
    return value === 1 ? '1 Litro' : `${value} Litros`;
  }
  const match = RATING_SCALE.find((item) => item.value === value);
  if (!match) return '';
  if (habitKey === 'ansiedad') return match.anxietyLabel;
  if (habitKey === 'estres') return match.stressLabel;
  return match.label;
};

/**
 * Catálogo normalizado de conceptos con metadata, preguntas específicas e imágenes.
 */
export const HABIT_CATALOG: Record<HabitKey, HabitDefinition> = {
  comida: {
    key: 'comida',
    label: 'Comida',
    category: 'lifestyle',
    question: '¿Cómo evalúas tu alimentación hoy?',
    image: require('../../assets/comida.png'),
  },
  ejercicio: {
    key: 'ejercicio',
    label: 'Ejercicio',
    category: 'lifestyle',
    question: '¿Cómo estuvo tu actividad física hoy?',
    image: require('../../assets/ejercicio.png'),
  },
  hidratacion: {
    key: 'hidratacion',
    label: 'Hidratación',
    category: 'lifestyle',
    question: '¿Cuántos litros de agua tomaste hoy?',
    image: require('../../assets/hidratacion.png'),
  },
  ansiedad: {
    key: 'ansiedad',
    label: 'Ansiedad',
    category: 'emotional',
    question: '¿Cómo sentiste tu nivel de ansiedad hoy?',
    image: require('../../assets/ansiedad.png'),
  },
  sueno: {
    key: 'sueno',
    label: 'Sueño',
    category: 'lifestyle',
    question: '¿Cómo evalúas tu descanso?                         ¿Cuántas horas dormiste?',
    image: require('../../assets/sueno.png'),
  },
  estres: {
    key: 'estres',
    label: 'Estrés',
    category: 'emotional',
    question: '¿Cómo sentiste tu nivel de estrés hoy?',
    image: require('../../assets/estres.png'),
  },
};

export const HABIT_KEYS: HabitKey[] = [
  'comida',
  'ejercicio',
  'hidratacion',
  'ansiedad',
  'sueno',
  'estres',
];

export const INITIAL_HABITS_STATE: DailyHabitRatings = {
  comida: null,
  ejercicio: null,
  hidratacion: null,
  ansiedad: null,
  sueno: null,
  sueno_horas: null,
  estres: null,
};
