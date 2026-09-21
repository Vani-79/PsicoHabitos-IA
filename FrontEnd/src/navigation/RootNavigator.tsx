import React from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { PatientNavigator } from './PatientNavigator';
import { PsychologistNavigator } from './PsychologistNavigator';

export const RootNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#0F613B" style={styles.spinner} />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  if (user.role === 'psicologo') {
    return <PsychologistNavigator />;
  }

  return <PatientNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});
