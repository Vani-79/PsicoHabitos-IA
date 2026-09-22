import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PsychologistStackParamList } from './types';
import { PsychologistDashboardScreen } from '../screens/Psicologo/Pantallaprincipal.psicologo';
import { RegisterPatientScreen } from '../screens/Psicologo/Registropaciente.psicologo';
import { PatientDetailScreen } from '../screens/Psicologo/PatientDetailScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<PsychologistStackParamList>();

export const PsychologistNavigator: React.FC = () => {
  const { user, patients, logout, registerPatient } = useAuth();

  return (
    <Stack.Navigator
      initialRouteName="PsychologistDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="PsychologistDashboard">
        {({ navigation }) => (
          <PsychologistDashboardScreen
            doctorName={user?.name || 'Especialista'}
            patients={patients}
            onLogout={logout}
            onRegisterPatient={() => navigation.navigate('RegisterPatient')}
            onSelectPatient={(patient) => navigation.navigate('PatientDetail', { patient })}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="PatientDetail">
        {({ navigation, route }) => (
          <PatientDetailScreen
            patient={route.params.patient}
            onBack={() => navigation.goBack()}
            onScheduleSession={() => {
              // Por ahora sin backend: solo un placeholder
              console.log('Agendar sesión para', route.params.patient.email);
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="RegisterPatient">
        
        {({ navigation }) => (
          <RegisterPatientScreen
            onBack={() => navigation.goBack()}
            onRegisterSuccess={async (record) => {
              const res = await registerPatient(record);
              if (res.success) {
                navigation.goBack();
              }
              return res;
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
