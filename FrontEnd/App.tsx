import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeScreen } from './src/screens/auth/WelcomeScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { DailyCheckInScreen } from './src/screens/patient/DailyCheckInScreen';
import { PatientCalendarScreen } from './src/screens/patient/PatientCalendarScreen';
import { PatientExercisesScreen } from './src/screens/patient/PatientExercisesScreen';
import { HabitDetailScreen, HabitSection } from './src/screens/patient/HabitDetailScreen';
import { PatientChatbotScreen } from './src/screens/patient/PatientChatbotScreen';
import { PatientProfileScreen } from './src/screens/patient/PatientProfileScreen';
import { PsychologistDashboardScreen } from './src/screens/psychologist/PsychologistDashboardScreen';
import { RegisterPatientScreen } from './src/screens/psychologist/RegisterPatientScreen';
import { UserRole } from './src/constants/auth';
import { MySqlPatientRecord } from './src/types/patient';
import { PatientTab } from './src/components/PatientBottomNav';
import { authService, patientService, storageService, authSession } from './src/services';

export type AppScreen =
  | 'welcome'
  | 'login'
  | 'habits'
  | 'patient-calendar'
  | 'patient-exercises'
  | 'patient-exercises-detail'
  | 'patient-chatbot'
  | 'patient-profile'
  | 'psychologist-dashboard'
  | 'psychologist-register-patient';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('welcome');
  const [selectedHabit, setSelectedHabit] = useState<HabitSection>('ansiedad');
  const [selectedHabitTitle, setSelectedHabitTitle] = useState<string>('Ansiedad');
  const [activeUserName, setActiveUserName] = useState<string>('Carlos');
  const [activeUserEmail, setActiveUserEmail] = useState<string>('');
  const [patients, setPatients] = useState<MySqlPatientRecord[]>([]);

  // Reanudación automática de sesión guardada (Auto-Login cuando se marcó "Recuérdame")
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const savedSession = await storageService.getUserSession();
        if (savedSession && isMounted) {
          if (savedSession.token) {
            authSession.setToken(savedSession.token);
          }
          setActiveUserName(savedSession.name);
          setActiveUserEmail(savedSession.email);
          if (savedSession.role === 'psicologo') {
            const psychologistPatients = await patientService.getRecentPatients(5, savedSession.email);
            if (isMounted) setPatients(psychologistPatients);
            if (isMounted) setCurrentScreen('psychologist-dashboard');
          } else {
            if (isMounted) setCurrentScreen('habits');
          }
        }
      } catch (err) {
        console.warn('[App] Error al restaurar sesión guardada:', err);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleHardwareBack = () => {
      switch (currentScreen) {
        case 'login':
          setCurrentScreen('welcome');
          return true;
        case 'patient-exercises-detail':
          setCurrentScreen('patient-exercises');
          return true;
        case 'patient-calendar':
        case 'patient-exercises':
        case 'patient-chatbot':
        case 'patient-profile':
          setCurrentScreen('habits');
          return true;
        case 'psychologist-register-patient':
          setCurrentScreen('psychologist-dashboard');
          return true;
        default:
          return false;
      }
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [currentScreen]);

  const handlePatientRegistration = async (record: MySqlPatientRecord) => {
    const res = await patientService.registerPatient(record, activeUserEmail);
    if (res.success) {
      const updated = await patientService.getRecentPatients(5, activeUserEmail);
      setPatients(updated);
      setCurrentScreen('psychologist-dashboard');
    }
    return res;
  };

  const handleLoginSuccess = async (email: string, role: UserRole, name: string) => {
    setActiveUserName(name);
    setActiveUserEmail(email);
    if (role === 'psicologo') {
      const psychologistPatients = await patientService.getRecentPatients(5, email);
      setPatients(psychologistPatients);
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

  const handleLogout = async () => {
    try {
      await authService.logout();
      await storageService.clearAll(); // Elimina completamente tanto la sesión activa como el correo recordado
    } catch (e) {
      console.warn('Error during logout:', e);
    }
    setActiveUserName('');
    setActiveUserEmail('');
    setPatients([]);
    setCurrentScreen('welcome');
  };


  const openHabitDetail = (habitKey: HabitSection, habitTitle: string) => {
    setSelectedHabit(habitKey);
    setSelectedHabitTitle(habitTitle);
    setCurrentScreen('patient-exercises-detail');
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
          userEmail={activeUserEmail}
          onNavigateTab={handlePatientTabNavigate}
        />
      )}

      {currentScreen === 'patient-calendar' && (
        <PatientCalendarScreen
          userName={activeUserName}
          onNavigateTab={handlePatientTabNavigate}
        />
      )}

      {currentScreen === 'patient-exercises' && (
        <PatientExercisesScreen
          userName={activeUserName}
          onNavigateTab={handlePatientTabNavigate}
          onOpenHabit={openHabitDetail}
        />
      )}

      {currentScreen === 'patient-exercises-detail' && (
        <HabitDetailScreen
          habitKey={selectedHabit}
          habitTitle={selectedHabitTitle}
          onBack={() => setCurrentScreen('patient-exercises')}
          onNavigateTab={handlePatientTabNavigate}
        />
      )}

      {currentScreen === 'patient-chatbot' && (
        <PatientChatbotScreen
          userName={activeUserName}
          onNavigateTab={handlePatientTabNavigate}
        />
      )}

      {currentScreen === 'patient-profile' && (
        <PatientProfileScreen
          userName={activeUserName}
          userEmail={activeUserEmail}
          onNavigateTab={handlePatientTabNavigate}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'psychologist-dashboard' && (
        <PsychologistDashboardScreen
          doctorName={activeUserName}
          patients={patients}
          onLogout={handleLogout}
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