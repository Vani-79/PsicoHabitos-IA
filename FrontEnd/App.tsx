import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation';
import { habitNotificationService } from './src/services';

export const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Inicializar servicio de notificaciones con callback de navegación directa al tab 'Habits'
    void habitNotificationService.init(() => {
      if (navigationRef.isReady()) {
        try {
          navigationRef.navigate('Habits');
        } catch (e) {
          console.warn('[App] Error navegando a Habits desde notificación:', e);
        }
      }
    });

    // Escuchar cambios de estado de la app (Background -> Active) para re-sincronizar recordatorios
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        void habitNotificationService.syncHabitReminders();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}