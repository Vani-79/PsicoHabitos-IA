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

interface ActivationCodeCardProps {
  email: string;
  userName?: string;
  onSuccess: () => void;
  onBackToEmail: () => void;
}

export const ActivationCodeCard: React.FC<ActivationCodeCardProps> = ({
  email,
  userName,
  onSuccess,
  onBackToEmail,
}) => {
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const validateCode = (code: string): boolean => {
    if (!code) {
      Alert.alert('Código requerido', 'Por favor ingresa el código de 6 dígitos enviado a tu correo.');
      return false;
    }
    if (code.length !== 6) {
      Alert.alert(
        'Código incompleto',
        'El código de confirmación debe tener exactamente 6 dígitos.'
      );
      return false;
    }
    return true;
  };

  const handleVerifyCode = async () => {
    const targetEmail = email.trim().toLowerCase();
    const cleanCode = activationCode.trim();

    if (!validateCode(cleanCode)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyActivationCode(
        targetEmail,
        cleanCode
      );
      if (response.success) {
        onSuccess();
      } else {
        Alert.alert(
          'Código incorrecto',
          response.error || 'El código de confirmación es inválido o ha expirado.'
        );
      }
    } catch (err) {
      console.error('Error al verificar código de activación:', err);
      Alert.alert('Error', 'Ocurrió un fallo al verificar el código de confirmación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const targetEmail = email.trim().toLowerCase();
    setIsResending(true);
    try {
      const response = await authService.sendActivationCode(targetEmail);
      if (response.success) {
        Alert.alert(
          'Código Reenviado',
          `Se ha enviado un nuevo código de confirmación a ${targetEmail}.`
        );
      } else {
        Alert.alert('Error', response.error || 'No se pudo reenviar el código.');
      }
    } catch (err) {
      console.error('Error al reenviar código de activación:', err);
      Alert.alert('Error', 'Ocurrió un error al reenviar el código de confirmación.');
    } finally {
      setIsResending(false);
    }
  };

  const isSubmitDisabled = activationCode.trim().length !== 6 || isLoading;

  return (
    <View style={authStyles.card}>
      <View style={authStyles.welcomeBadge}>
        <Ionicons name="mail-unread-outline" size={20} color="#0F613B" />
        <Text style={authStyles.welcomeBadgeText}>PRIMER ACCESO / ACTIVACIÓN</Text>
      </View>

      <Text style={authStyles.cardTitle}>Confirma tu Correo</Text>
      <Text style={authStyles.cardSubtitle}>
        {userName ? `¡Hola ${userName}!\n` : ''}
        Hemos enviado un código a{'\n'}
        <Text style={{ fontWeight: '700', color: '#0F613B' }}>{email}</Text>
        {'\n'}para activar tu cuenta y crear tu contraseña.
      </Text>

      {/* Input de Código */}
      <View style={authStyles.inputGroup}>
        <Text style={authStyles.inputLabel}>Código de confirmación</Text>
        <View style={authStyles.codeInputWrapper}>
          <TextInput
            style={authStyles.codeInput}
            placeholder="------"
            placeholderTextColor="#A7F3D0"
            value={activationCode}
            onChangeText={(text) =>
              setActivationCode(text.replace(/\D/g, '').slice(0, 6))
            }
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>
        <Text style={authStyles.codeHelperText}>
          El código de 6 dígitos vence en 15 minutos.
        </Text>
      </View>

      {/* Botón Validar Código */}
      <TouchableOpacity
        style={[
          authStyles.submitButton,
          isSubmitDisabled && authStyles.submitButtonDisabled,
        ]}
        onPress={handleVerifyCode}
        activeOpacity={0.85}
        disabled={isSubmitDisabled}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authStyles.submitButtonText}>Validar y Crear Contraseña</Text>
        )}
      </TouchableOpacity>

      {/* Reenviar código */}
      <View style={authStyles.resendRow}>
        <Text style={authStyles.resendPromptText}>¿No recibiste el código?</Text>
        <TouchableOpacity
          onPress={handleResendCode}
          disabled={isResending}
          activeOpacity={0.7}
        >
          {isResending ? (
            <ActivityIndicator
              size="small"
              color="#0F613B"
              style={{ marginLeft: 6 }}
            />
          ) : (
            <Text style={authStyles.resendLinkText}>Reenviar código</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Cambiar de correo */}
      <TouchableOpacity
        style={authStyles.modifyEmailLink}
        onPress={onBackToEmail}
        activeOpacity={0.7}
      >
        <Text style={authStyles.modifyEmailText}>Cambiar correo electrónico</Text>
      </TouchableOpacity>
    </View>
  );
};
