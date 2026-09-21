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
import { UserRole } from '../../../constants/auth';
import { authService } from '../../../services';
import { validatePasswordComplexity } from '../../../utils/validators';
import { authStyles } from './authStyles';
import {
  PasswordRequirements,
  checkPasswordRequirements,
} from './PasswordRequirements';

interface ForgotResetPasswordCardProps {
  email: string;
  recoveryCode: string;
  onSuccess: (
    email: string,
    role: UserRole,
    name: string,
    token?: string,
    rememberMe?: boolean
  ) => void;
  onBackToLogin: () => void;
}

export const ForgotResetPasswordCard: React.FC<ForgotResetPasswordCardProps> = ({
  email,
  recoveryCode,
  onSuccess,
  onBackToLogin,
}) => {
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { isValid: isResetValid } = checkPasswordRequirements(
    resetNewPassword,
    resetConfirmPassword
  );

  const validateResetInputs = (
    cleanNewPassword: string,
    cleanConfirm: string
  ): boolean => {
    if (!cleanNewPassword) {
      Alert.alert('Contraseña requerida', 'Por favor ingresa tu nueva contraseña.');
      return false;
    }

    const complexity = validatePasswordComplexity(cleanNewPassword);
    if (!complexity.isValid) {
      Alert.alert(
        'Contraseña no cumple requisitos',
        complexity.error ||
          'Verifica que tu contraseña cumpla todos los requisitos de seguridad.'
      );
      return false;
    }

    if (cleanNewPassword !== cleanConfirm) {
      Alert.alert(
        'Las contraseñas no coinciden',
        'Por favor confirma que ambas contraseñas sean idénticas.'
      );
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    const targetEmail = email.trim().toLowerCase();
    const cleanNewPassword = resetNewPassword.trim();
    const cleanConfirm = resetConfirmPassword.trim();

    if (!validateResetInputs(cleanNewPassword, cleanConfirm)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.resetPassword(
        targetEmail,
        recoveryCode.trim(),
        cleanNewPassword
      );
      if (response.success && response.data) {
        Alert.alert(
          '¡Contraseña Restablecida!',
          'Tu contraseña ha sido actualizada exitosamente. Ya puedes acceder a la aplicación.',
          [
            {
              text: 'Ingresar Ahora',
              onPress: () => {
                onSuccess(
                  response.data!.email,
                  response.data!.role,
                  response.data!.name,
                  response.data!.token,
                  false
                );
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          response.error || 'No se pudo restablecer la contraseña.'
        );
      }
    } catch (err) {
      console.error('Error al restablecer contraseña:', err);
      Alert.alert('Error', 'Ocurrió un fallo al restablecer la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || !isResetValid;

  return (
    <View style={authStyles.card}>
      <View style={authStyles.welcomeBadge}>
        <Ionicons name="lock-closed-outline" size={20} color="#0F613B" />
        <Text style={authStyles.welcomeBadgeText}>NUEVA CONTRASEÑA</Text>
      </View>

      <Text style={authStyles.cardTitle}>Restablecer Contraseña</Text>
      <Text style={authStyles.cardSubtitle}>
        Ingresa tu nueva contraseña para volver a acceder a tu cuenta.
      </Text>

      {/* Email (solo lectura) */}
      <View style={authStyles.inputGroup}>
        <Text style={authStyles.inputLabel}>Correo electrónico verificado</Text>
        <View style={[authStyles.input, authStyles.inputDisabled]}>
          <Text style={authStyles.inputDisabledText}>{email}</Text>
        </View>
      </View>

      {/* Nueva Contraseña */}
      <View style={authStyles.inputGroup}>
        <Text style={authStyles.inputLabel}>Nueva Contraseña</Text>
        <View style={authStyles.passwordInputWrapper}>
          <TextInput
            style={authStyles.passwordInput}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor="#9CA3AF"
            value={resetNewPassword}
            onChangeText={setResetNewPassword}
            secureTextEntry={!showResetNewPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={authStyles.eyeIconButton}
            onPress={() => setShowResetNewPassword(!showResetNewPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showResetNewPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirmar Contraseña */}
      <View style={authStyles.inputGroup}>
        <Text style={authStyles.inputLabel}>Confirmar Contraseña</Text>
        <View style={authStyles.passwordInputWrapper}>
          <TextInput
            style={authStyles.passwordInput}
            placeholder="Repite tu nueva contraseña"
            placeholderTextColor="#9CA3AF"
            value={resetConfirmPassword}
            onChangeText={setResetConfirmPassword}
            secureTextEntry={!showResetConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={authStyles.eyeIconButton}
            onPress={() =>
              setShowResetConfirmPassword(!showResetConfirmPassword)
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showResetConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Requisitos de seguridad interactivos */}
      <PasswordRequirements
        password={resetNewPassword}
        confirmPassword={resetConfirmPassword}
      />

      {/* Botón Guardar e Ingresar */}
      <TouchableOpacity
        style={[
          authStyles.submitButton,
          isSubmitDisabled && authStyles.submitButtonDisabled,
        ]}
        onPress={handleResetPassword}
        activeOpacity={isResetValid ? 0.85 : 0.95}
        disabled={isSubmitDisabled}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authStyles.submitButtonText}>
            Guardar Contraseña e Ingresar
          </Text>
        )}
      </TouchableOpacity>

      {/* Cancelar y Volver */}
      <TouchableOpacity style={authStyles.cancelLink} onPress={onBackToLogin}>
        <Text style={authStyles.cancelLinkText}>Cancelar y volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );
};
