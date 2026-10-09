import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { HabitSection } from '../screens/Paciente/Ejerciciosvideos.paciente';
import { MySqlPatientRecord } from '../types/patient';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
};

export type PatientStackParamList = {
  Habits: undefined;
  PatientCalendar: undefined;
  PatientExercises: undefined;
  PatientExerciseDetail: { habitKey: HabitSection; habitTitle: string };
  PatientChatbot: undefined;
  PatientProfile: undefined;
};

import { HabitKey } from '../types/habits';

export type HabitPeriod =
  | 'therapy_start'
  | 'year'
  | '6months'
  | '3months'
  | 'month'
  | 'week'
  | 'custom'
  | 'day';

export interface HabitReportFilters {
  habits: HabitKey[];
  period: HabitPeriod;
  specificDate?: string; // 'YYYY-MM-DD' (retrocompatibilidad)
  startDate?: string;    // 'YYYY-MM-DD' fecha inicio de rango
  endDate?: string;      // 'YYYY-MM-DD' fecha fin de rango
}

export type PsychologistStackParamList = {
  PsychologistDashboard: undefined;
  RegisterPatient: undefined;
  PatientDetail: { patient: MySqlPatientRecord };
  PatientHabitReport: {
    patient: MySqlPatientRecord;
    filters: HabitReportFilters;
  };
};

// Tipos auxiliares para navegación tipada en componentes
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type PatientNavigationProp = NativeStackNavigationProp<PatientStackParamList>;
export type PsychologistNavigationProp = NativeStackNavigationProp<PsychologistStackParamList>;

export type PatientExerciseDetailScreenProps = NativeStackScreenProps<
  PatientStackParamList,
  'PatientExerciseDetail'
>;
