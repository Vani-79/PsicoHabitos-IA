import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeScreen } from './src/screens/auth/WelcomeScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { DailyCheckInScreen } from './src/screens/patient/DailyCheckInScreen';
import { PatientCalendarScreen } from './src/screens/patient/PatientCalendarScreen';
import { PatientExercisesScreen } from './src/screens/patient/PatientExercisesScreen';
import { PatientChatbotScreen } from './src/screens/patient/PatientChatbotScreen';
import { PatientProfileScreen } from './src/screens/patient/PatientProfileScreen';
import { PsychologistDashboardScreen } from './src/screens/psychologist/PsychologistDashboardScreen';
import { RegisterPatientScreen } from './src/screens/psychologist/RegisterPatientScreen';
import { UserRole } from './src/constants/auth';
import { MySqlPatientRecord } from './src/types/patient';
import { PatientTab } from './src/components/PatientBottomNav';
import { patientService } from './src/services';

export type AppScreen =
  | 'welcome'
  | 'login'
  | 'habits'
  | 'patient-calendar'
  | 'patient-exercises'
  | 'patient-chatbot'
  | 'patient-profile'
  | 'psychologist-dashboard'
  | 'psychologist-register-patient';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('welcome');
  const [activeUserName, setActiveUserName] = useState<string>('Carlos');
  const [patients, setPatients] = useState<MySqlPatientRecord[]>([]);

  useEffect(() => {
    // Carga inicial de pacientes desde el servicio
    patientService.getRecentPatients().then((list) => {
      setPatients(list);
    });
  }, []);

  const handlePatientRegistration = async (record: MySqlPatientRecord) => {
    await patientService.registerPatient(record);
    const updated = await patientService.getRecentPatients();
    setPatients(updated);
    setCurrentScreen('psychologist-dashboard');
  };

  const handleLoginSuccess = (email: string, role: UserRole, name: string) => {
    setActiveUserName(name);
    if (role === 'psicologo') {
      setCurrentScreen('psychologist-dashboard');
    } else {
      setCurrentScreen('habits');
    }
  };

  const handlePatientTabNavigate = (tab: PatientTab) => {
    switch (tab) {
      case 'calendar':
        setCurrentScreen('patient-calendar');
        break;
      case 'exercises':
        setCurrentScreen('patient-exercises');
        break;
      case 'chatbot':
        setCurrentScreen('patient-chatbot');
        break;
      case 'profile':
        setCurrentScreen('patient-profile');
        break;
      case 'habits':
        setCurrentScreen('habits');
        break;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {currentScreen === 'welcome' && (
        <WelcomeScreen
          onStartLogin={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'login' && (
        <LoginScreen
          onBack={() => setCurrentScreen('welcome')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentScreen === 'habits' && (
        <DailyCheckInScreen
          userName={activeUserName}
          onBack={() => setCurrentScreen('welcome')}
          onNavigateTab={handlePatientTabNavigate}
        />
      )}

      {currentScreen === 'patient-calendar' && (
        <PatientCalendarScreen
          userName={activeUserName}
          onBack={() => setCurrentScreen('habits')}
          onNavigateTab={handlePatientTabNavigate}
        />
      )}

      {currentScreen === 'patient-exercises' && (
        <PatientExercisesScreen
          userName={activeUserName}
          onBack={() => setCurrentScreen('habits')}
          onNavigateTab={handlePatientTabNavigate}
        />
      )}

      {currentScreen === 'patient-chatbot' && (
        <PatientChatbotScreen
          userName={activeUserName}
          onBack={() => setCurrentScreen('habits')}
          onNavigateTab={handlePatientTabNavigate}
        />
      )}

      {currentScreen === 'patient-profile' && (
        <PatientProfileScreen
          userName={activeUserName}
          onBack={() => setCurrentScreen('habits')}
          onNavigateTab={handlePatientTabNavigate}
        />
      )}

      {currentScreen === 'psychologist-dashboard' && (
        <PsychologistDashboardScreen
          doctorName={activeUserName}
          patients={patients}
          onLogout={() => setCurrentScreen('welcome')}
          onRegisterPatient={() => setCurrentScreen('psychologist-register-patient')}
        />
      )}

      {currentScreen === 'psychologist-register-patient' && (
        <RegisterPatientScreen
          onBack={() => setCurrentScreen('psychologist-dashboard')}
          onRegisterSuccess={handlePatientRegistration}
        />
      )}
    </SafeAreaProvider>
  );
}