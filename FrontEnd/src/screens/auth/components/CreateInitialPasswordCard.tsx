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
import { PasswordRequirements } from './PasswordRequirements';

interface CreateInitialPasswordCardProps {
  email: string;
  userName: string;
  acceptedTerms: boolean;
  setAcceptedTerms: (accepted: boolean) => void;
  onOpenTermsModal: () => void;
  onSuccess: (email: string, role: UserRole, name: string) => void;
  onBackToLogin: () => void;
}

export const CreateInitialPasswordCard: React.FC<CreateInitialPasswordCardProps> = ({
  email,
  userName,
  acceptedTerms,
  setAcceptedTerms,
  onOpenTermsModal,
  onSuccess,
  onBackToLogin,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateInputs = (cleanNewPassword: string, cleanConfirm: string): boolean => {
    if (!cleanNewPassword) {
      Alert.alert('Contraseña requerida', 'Por favor ingresa una nueva contraseña.');
      return false;
    }

    const complexity = validatePasswordComplexity(cleanNewPassword);
    if (!complexity.isValid) {
      Alert.alert(
        'Contraseña no cumple requisitos',
        complexity.error || 'Verifica que tu contraseña cumpla todos los requisitos de seguridad.'
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

    if (!acceptedTerms) {
      Alert.alert(
        'Aceptación de términos requerida',
        'Para continuar y crear tu contraseña, debes aceptar los Términos y Condiciones y la Política de Privacidad (Ley N° 21.719).'
      );
      return false;
    }

    return true;
  };

  const handleCreatePassword = async () => {
    const targetEmail = email.trim().toLowerCase();
    const cleanNewPassword = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!validateInputs(cleanNewPassword, cleanConfirm)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.createInitialPassword(
        targetEmail,
        cleanNewPassword,
        true
      );

      if (response.success && response.data) {
        Alert.alert(
          '¡Contraseña Creada!',
          'Tu acceso ha sido configurado exitosamente.',
          [
            {
              text: 'Ingresar',
              onPress: () => {
                onSuccess(
                  response.data!.email,
                  response.data!.role,
                  response.data!.name
                );
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          response.error || 'No se pudo guardar la contraseña. Inténtalo nuevamente.'
        );
      }
    } catch (err) {
      console.error('Error al crear contraseña:', err);
      Alert.alert('Error', 'Ocurrió un fallo de conexión al crear tu contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || !acceptedTerms;

  return (
    <View style={authStyles.card}>
      <View style={authStyles.welcomeBadge}>
        <Ionicons name="key-outline" size={22} color="#0F613B" />
        <Text style={authStyles.welcomeBadgeText}>PRIMER ACCESO AL SISTEMA</Text>
      </View>

      <Text style={authStyles.cardTitle}>Crear Contraseña</Text>
      <Text style={authStyles.cardSubtitle}>
        ¡Hola <Text style={{ fontWeight: '700', color: '#0F613B' }}>{userName}</Text>! Tu cuenta ha sido dada de alta. Define tu contraseña personal para acceder.
      </Text>

      {/* Email (solo lectura) */}
      <View style={authStyles.inputGroup}>
        <Text style={authStyles.inputLabel}>Correo electrónico</Text>
        <View style={[authStyles.input, authStyles.inputDisabled]}>
          <Text style={authStyles.inputDisabledText}>{email.trim().toLowerCase()}</Text>
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
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={authStyles.eyeIconButton}
            onPress={() => setShowNewPassword(!showNewPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
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
            placeholder="Repite tu contraseña"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={authStyles.eyeIconButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Requisitos de seguridad interactivos */}
      <PasswordRequirements
        password={newPassword}
        confirmPassword={confirmPassword}
      />

      {/* Respaldo Legal de Consentimiento (Ley N° 21.719) */}
      <View style={authStyles.termsAgreementBox}>
        <TouchableOpacity
          style={authStyles.termsCheckboxRow}
          onPress={() => setAcceptedTerms(!acceptedTerms)}
          activeOpacity={0.8}
        >
          <View
            style={[
              authStyles.termsCheckbox,
              acceptedTerms && authStyles.termsCheckboxChecked,
            ]}
          >
            {acceptedTerms && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
          </View>
          <View style={authStyles.termsTextContainer}>
            <Text style={authStyles.termsAgreementText}>
              He leído y acepto la{' '}
              <Text style={authStyles.termsLinkText} onPress={onOpenTermsModal}>
                Protección de Datos y Confidencialidad (Ley N° 21.719)
              </Text>
              .
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={authStyles.termsInfoButton}
          onPress={onOpenTermsModal}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark-outline" size={15} color="#0F613B" />
          <Text style={authStyles.termsInfoButtonText}>
            Ver términos legales y resguardo de confidencialidad
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botón Guardar e Ingresar */}
      <TouchableOpacity
        style={[
          authStyles.submitButton,
          isSubmitDisabled && authStyles.submitButtonDisabled,
        ]}
        onPress={handleCreatePassword}
        activeOpacity={acceptedTerms ? 0.85 : 0.95}
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

      {/* Volver */}
      <TouchableOpacity style={authStyles.cancelLink} onPress={onBackToLogin}>
        <Text style={authStyles.cancelLinkText}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );
};
