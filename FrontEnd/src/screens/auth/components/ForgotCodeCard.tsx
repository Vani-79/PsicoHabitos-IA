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

interface ForgotCodeCardProps {
  email: string;
  onSuccess: (code: string) => void;
  onBackToEmail: () => void;
  onBackToLogin: () => void;
}

export const ForgotCodeCard: React.FC<ForgotCodeCardProps> = ({
  email,
  onSuccess,
  onBackToEmail,
  onBackToLogin,
}) => {
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const validateCode = (code: string): boolean => {
    if (!code) {
      Alert.alert('Código requerido', 'Por favor ingresa el código de 6 dígitos.');
      return false;
    }
    if (code.length !== 6) {
      Alert.alert(
        'Código incompleto',
        'El código de verificación debe tener 6 dígitos.'
      );
      return false;
    }
    return true;
  };

  const handleVerifyRecoveryCode = async () => {
    const targetEmail = email.trim().toLowerCase();
    const cleanCode = recoveryCode.trim();

    if (!validateCode(cleanCode)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyPasswordResetCode(
        targetEmail,
        cleanCode
      );
      if (response.success) {
        onSuccess(cleanCode);
      } else {
        Alert.alert(
          'Código incorrecto',
          response.error || 'El código es inválido o ha expirado.'
        );
      }
    } catch (err) {
      console.error('Error al verificar código:', err);
      Alert.alert('Error', 'Ocurrió un fallo al verificar el código.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const targetEmail = email.trim().toLowerCase();
    setIsResending(true);
    try {
      const response = await authService.sendPasswordResetCode(targetEmail);
      if (response.success) {
        Alert.alert(
          'Código Reenviado',
          `Se ha generado y enviado un nuevo código a ${targetEmail}.`
        );
      } else {
        Alert.alert('Error', response.error || 'No se pudo reenviar el código.');
      }
    } catch (err) {
      console.error('Error al reenviar código:', err);
      Alert.alert('Error', 'Ocurrió un error al reenviar el código.');
    } finally {
      setIsResending(false);
    }
  };

  const isSubmitDisabled = recoveryCode.trim().length !== 6 || isLoading;

  return (
    <View style={authStyles.card}>
      <View style={authStyles.welcomeBadge}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#0F613B" />
        <Text style={authStyles.welcomeBadgeText}>VERIFICAR CÓDIGO</Text>
      </View>

      <Text style={authStyles.cardTitle}>Código de 6 Dígitos</Text>
      <Text style={authStyles.cardSubtitle}>
        Hemos enviado un código a{'\n'}
        <Text style={{ fontWeight: '700', color: '#0F613B' }}>{email}</Text>
      </Text>

      {/* Input de Código */}
      <View style={authStyles.inputGroup}>
        <Text style={authStyles.inputLabel}>Ingresa el código</Text>
        <View style={authStyles.codeInputWrapper}>
          <TextInput
            style={authStyles.codeInput}
            placeholder="------"
            placeholderTextColor="#A7F3D0"
            value={recoveryCode}
            onChangeText={(text) =>
              setRecoveryCode(text.replace(/\D/g, '').slice(0, 6))
            }
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>
        <Text style={authStyles.codeHelperText}>
          El código tiene 6 dígitos numéricos y vence en 15 minutos.
        </Text>
      </View>

      {/* Botón Verificar Código */}
      <TouchableOpacity
        style={[
          authStyles.submitButton,
          isSubmitDisabled && authStyles.submitButtonDisabled,
        ]}
        onPress={handleVerifyRecoveryCode}
        activeOpacity={0.85}
        disabled={isSubmitDisabled}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authStyles.submitButtonText}>Verificar Código</Text>
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

      {/* Modificar Correo */}
      <TouchableOpacity
        style={authStyles.modifyEmailLink}
        onPress={onBackToEmail}
      >
        <Text style={authStyles.modifyEmailText}>Cambiar correo electrónico</Text>
      </TouchableOpacity>

      {/* Volver */}
      <TouchableOpacity style={authStyles.cancelLink} onPress={onBackToLogin}>
        <Text style={authStyles.cancelLinkText}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
};
