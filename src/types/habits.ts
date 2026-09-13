import { ImageSourcePropType } from 'react-native';

export type HabitKey = 'comida' | 'ejercicio' | 'hidratacion' | 'ansiedad' | 'sueno' | 'estres';

export type ConceptCategory = 'lifestyle' | 'emotional';

export interface RatingScaleItem {
  value: number;
  label: string;           // Etiqueta para hábitos de conducta (Comida, Ejercicio, etc.)
  anxietyLabel: string;    // Etiqueta para Ansiedad (femenino: Muy intensa, Intensa, etc.)
  stressLabel: string;     // Etiqueta para Estrés (masculino: Muy intenso, Intenso, etc.)
  color: string;
}

export interface HabitDefinition {
  key: HabitKey;
  label: string;
  category: ConceptCategory;
  question: string;
  image?: ImageSourcePropType;
  emoji?: string;
}

export interface DailyHabitRatings {
  comida: number | null;
  ejercicio: number | null;
  hidratacion: number | null;
  ansiedad: number | null;
  sueno: number | null;
  sueno_horas?: number | null;
  estres: number | null;
}

export interface DailyEvaluationState {
  date: string;
  ratings: DailyHabitRatings;
  isConfirmed: boolean;
  confirmedAt?: string;
}

/**
 * Esquema normalizado para guardar en base de datos MySQL.
 * Compatible con columnas de tipo DATE y DATETIME.
 */
export interface MySqlDailyHabitRecord {
  user_id: string;
  evaluation_date: string; // Formato 'YYYY-MM-DD' (DATE en MySQL)
  comida: number | null;
  ejercicio: number | null;
  hidratacion: number | null; // Litros consumidos al día (ej: 2.0, 2.5) - dato neutro informativo
  ansiedad: number | null;
  sueno: number | null;       // Calidad del sueño (1 al 5)
  sueno_horas: number | null; // Cantidad de horas dormidas (ej: 7.5, 8.0)
  estres: number | null;
  confirmed_at: string;    // Formato 'YYYY-MM-DD HH:MM:SS' (DATETIME en MySQL)
}
