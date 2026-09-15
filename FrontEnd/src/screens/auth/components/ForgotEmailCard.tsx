import React, { useState } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../../services';
import { authStyles } from './authStyles';

interface ForgotEmailCardProps {
  initialEmail?: string;
  onSuccess: (email: string) => void;
  onBackToLogin: () => void;
}

export const ForgotEmailCard: React.FC<ForgotEmailCardProps> = ({
  initialEmail = '',
  onSuccess,
  onBackToLogin,
}) => {
  const [forgotEmail, setForgotEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (targetEmail: string): boolean => {
    if (!targetEmail) {
      Alert.alert('Email requerido', 'Por favor ingresa tu correo electrónico.');
      return false;
    }
    if (!targetEmail.includes('@')) {
      Alert.alert('Email inválido', 'El correo electrónico debe contener un "@".');
      return false;
    }
    return true;
  };

  const handleSendRecoveryCode = async () => {
    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!validateEmail(targetEmail)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.sendPasswordResetCode(targetEmail);
      if (response.success) {
        onSuccess(targetEmail);
        Alert.alert(
          'Código Enviado',
          `Hemos enviado un código de 6 dígitos a ${targetEmail}. Revisa tu bandeja de entrada o spam.`
        );
      } else {
        Alert.alert(
          'Atención',
          response.error || 'No se pudo enviar el código de recuperación.'
        );
      }
    } catch (err) {
      console.error('Error al enviar código de recuperación:', err);
      Alert.alert('Error', 'Ocurrió un error de conexión al enviar el código.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={authStyles.card}>
      <View style={authStyles.welcomeBadge}>
        <Ionicons name="mail-unread-outline" size={20} color="#0F613B" />
        <Text style={authStyles.welcomeBadgeText}>RECUPERACIÓN DE CUENTA</Text>
      </View>

      <Text style={authStyles.cardTitle}>Recuperar Contraseña</Text>
      <Text style={authStyles.cardSubtitle}>
        Ingresa tu correo registrado en la app para enviarte un código de verificación de 6 dígitos.
      </Text>

      {/* Input Correo */}
      <View style={authStyles.inputGroup}>
        <Text style={authStyles.inputLabel}>Correo electrónico</Text>
        <TextInput
          style={authStyles.input}
          placeholder="ejemplo@email.com"
          placeholderTextColor="#9CA3AF"
          value={forgotEmail}
          onChangeText={setForgotEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Botón Enviar Código */}
      <TouchableOpacity
        style={[authStyles.submitButton, isLoading && { opacity: 0.7 }]}
        onPress={handleSendRecoveryCode}
        activeOpacity={0.85}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authStyles.submitButtonText}>Enviar Código</Text>
        )}
      </TouchableOpacity>

      {/* Volver */}
      <TouchableOpacity style={authStyles.cancelLink} onPress={onBackToLogin}>
        <Text style={authStyles.cancelLinkText}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
};
