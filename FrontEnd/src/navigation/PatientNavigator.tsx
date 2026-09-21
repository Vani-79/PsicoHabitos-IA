import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PatientStackParamList } from './types';
import { DailyCheckInScreen } from '../screens/Paciente/Habitos.paciente';
import { PatientCalendarScreen } from '../screens/Paciente/Sesiones.paciente';
import { PatientExercisesScreen } from '../screens/Paciente/Ejercicios.paciente';
import { HabitDetailScreen } from '../screens/Paciente/Ejerciciosvideos.paciente';
import { PatientChatbotScreen } from '../screens/Paciente/Chathope.paciente';
import { PatientProfileScreen } from '../screens/Paciente/Perfil.paciente';
import { PatientTab } from '../components/PatientBottomNav';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<PatientStackParamList>();

export const PatientNavigator: React.FC = () => {
  const { user, logout } = useAuth();
  const userName = user?.name || 'Carlos';
  const userEmail = user?.email || '';

  const getTabHandler = (navigation: any) => (tab: PatientTab) => {
    switch (tab) {
      case 'habits':
        navigation.navigate('Habits');
        break;
      case 'calendar':
        navigation.navigate('PatientCalendar');
        break;
      case 'exercises':
        navigation.navigate('PatientExercises');
        break;
      case 'chatbot':
        navigation.navigate('PatientChatbot');
        break;
      case 'profile':
        navigation.navigate('PatientProfile');
        break;
    }
  };

  return (
    <Stack.Navigator
      initialRouteName="Habits"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Habits">
        {({ navigation }) => (
          <DailyCheckInScreen
            userName={userName}
            userEmail={userEmail}
            onNavigateTab={getTabHandler(navigation)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PatientCalendar">
        {({ navigation }) => (
          <PatientCalendarScreen
            userName={userName}
            onNavigateTab={getTabHandler(navigation)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PatientExercises">
        {({ navigation }) => (
          <PatientExercisesScreen
            userName={userName}
            onNavigateTab={getTabHandler(navigation)}
            onOpenHabit={(habitKey, habitTitle) => {
              navigation.navigate('PatientExerciseDetail', { habitKey, habitTitle });
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="PatientExerciseDetail"
        options={{ animation: 'slide_from_right' }}
      >
        {({ navigation, route }) => (
          <HabitDetailScreen
            habitKey={route.params.habitKey}
            habitTitle={route.params.habitTitle}
            onBack={() => navigation.goBack()}
            onNavigateTab={getTabHandler(navigation)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PatientChatbot">
        {({ navigation }) => (
          <PatientChatbotScreen
            userName={userName}
            onNavigateTab={getTabHandler(navigation)}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PatientProfile">
        {({ navigation }) => (
          <PatientProfileScreen
            userName={userName}
            userEmail={userEmail}
            onNavigateTab={getTabHandler(navigation)}
            onLogout={logout}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
