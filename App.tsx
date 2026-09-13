import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { DailyCheckInScreen } from './src/screens/DailyCheckInScreen';
import { PatientCalendarScreen } from './src/screens/PatientCalendarScreen';
import { PatientExercisesScreen } from './src/screens/PatientExercisesScreen';
import { PatientChatbotScreen } from './src/screens/PatientChatbotScreen';
import { PatientProfileScreen } from './src/screens/PatientProfileScreen';
import { PsychologistDashboardScreen } from './src/screens/PsychologistDashboardScreen';
import { RegisterPatientScreen } from './src/screens/RegisterPatientScreen';
import { UserRole } from './src/constants/auth';
import { MySqlPatientRecord } from './src/types/patient';
import { PatientTab } from './src/components/PatientBottomNav';

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
          onLogout={() => setCurrentScreen('welcome')}
          onRegisterPatient={() => setCurrentScreen('psychologist-register-patient')}
        />
      )}

      {currentScreen === 'psychologist-register-patient' && (
        <RegisterPatientScreen
          onBack={() => setCurrentScreen('psychologist-dashboard')}
          onRegisterSuccess={(_record: MySqlPatientRecord) => {
            setCurrentScreen('psychologist-dashboard');
          }}
        />
      )}
    </SafeAreaProvider>
  );
}