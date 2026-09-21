import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserRole } from '../constants/auth';
import { AuthStackParamList } from './types';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  const { login } = useAuth();

  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome">
        {({ navigation }) => (
          <WelcomeScreen onStartLogin={() => navigation.navigate('Login')} />
        )}
      </Stack.Screen>

      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onBack={() => navigation.goBack()}
            onLoginSuccess={(
              email: string,
              role: UserRole,
              name: string,
              token?: string,
              rememberMe?: boolean
            ) => {
              login({ email, role, name, token }, rememberMe);
            }}
          />
        )}
      </Stack.Screen>


    </Stack.Navigator>
  );
};
