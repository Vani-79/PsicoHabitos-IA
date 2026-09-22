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

export type PsychologistStackParamList = {
  PsychologistDashboard: undefined;
  RegisterPatient: undefined;
  PatientDetail: { patient: MySqlPatientRecord };
};

// Tipos auxiliares para navegación tipada en componentes
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type PatientNavigationProp = NativeStackNavigationProp<PatientStackParamList>;
export type PsychologistNavigationProp = NativeStackNavigationProp<PsychologistStackParamList>;

export type PatientExerciseDetailScreenProps = NativeStackScreenProps<
  PatientStackParamList,
  'PatientExerciseDetail'
>;
