import React, { useState, useEffect } from 'react';
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
import { authService, storageService } from '../../../services';
import { authStyles } from './authStyles';

interface LoginFormProps {
  initialEmail?: string;
  onSuccess: (email: string, role: UserRole, name: string) => void;
  onNavigateToActivation: (email: string, name: string) => void;
  onNavigateToForgot: (email: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  initialEmail = '',
  onSuccess,
  onNavigateToActivation,
  onNavigateToForgot,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [loginStep, setLoginStep] = useState<'email' | 'password'>('email');
  const [userName, setUserName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadRemembered = async () => {
      if (!initialEmail) {
        const remembered = await storageService.getRememberedEmail();
        if (remembered) {
          setEmail(remembered);
          setRememberMe(true);
        }
      }
    };
    loadRemembered();
  }, [initialEmail]);


  const validateEmail = (targetEmail: string): boolean => {
    if (!targetEmail) {
      Alert.alert('Email requerido', 'Por favor ingresa tu correo electrónico.');
      return false;
    }
    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
      Alert.alert('Email inválido', 'Ingresa un formato de correo válido (ej. usuario@email.com).');
      return false;
    }
    return true;
  };

  /**
   * Paso 1: Valida el correo contra el backend.
   * Si es usuario nuevo (debe crear contraseña), envía el código OTP y lo lleva a la pantalla de verificación.
   * Si ya tiene contraseña, avanza al paso 2 para ingresarla.
   */
  const handleCheckEmailAndContinue = async () => {
    const targetEmail = email.trim().toLowerCase();

    if (!validateEmail(targetEmail)) {
      return;
    }

    setIsLoading(true);

    try {
      const check = await authService.checkEmail(targetEmail);

      if (!check.success && check.error) {
        Alert.alert('Error de conexión', check.error, [{ text: 'Entendido' }]);
        return;
      }

      if (!check.exists) {
        Alert.alert(
          'Correo no registrado',
          'No encontramos ninguna ficha o cuenta registrada con este correo. Si eres un nuevo paciente, por favor solicita a tu especialista que registre tu ficha clínica.',
          [{ text: 'Entendido' }]
        );
        return;
      }

      const displayName = check.name || 'Usuario';
      setUserName(displayName);

      if (check.requiresPasswordCreation) {
        // Enviar código de confirmación de 6 dígitos automáticamente
        const sendResult = await authService.sendActivationCode(targetEmail);
        if (sendResult.success) {
          Alert.alert(
            '¡Primer Acceso!',
            `Hemos enviado un código de confirmación de 6 dígitos a tu correo ${targetEmail} para activar tu cuenta y configurar tu contraseña.`,
            [
              {
                text: 'Continuar',
                onPress: () => onNavigateToActivation(targetEmail, displayName),
              },
            ]
          );
        } else {
          // Si falla el envío de red, permitir continuar al paso de código igualmente
          onNavigateToActivation(targetEmail, displayName);
        }
        return;
      }

      // Usuario existente con contraseña ya configurada
      setLoginStep('password');
    } catch (err) {
      console.error('Error al verificar correo:', err);
      Alert.alert('Error de conexión', 'No pudimos verificar tu correo en este momento. Inténtalo nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Paso 2: Valida credenciales e inicia sesión.
   */
  const handleLogin = async () => {
    const targetEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      Alert.alert('Contraseña requerida', 'Por favor ingresa tu contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login(targetEmail, cleanPassword);

      if (response.requiresPasswordCreation) {
        // Si por alguna razón debe crear contraseña
        await authService.sendActivationCode(targetEmail);
        onNavigateToActivation(targetEmail, response.data?.name || userName || 'Usuario');
        return;
      }

      if (response.success && response.data) {
        if (rememberMe) {
          await storageService.saveRememberedEmail(targetEmail);
          await storageService.saveUserSession({
            email: response.data.email,
            role: response.data.role,
            name: response.data.name,
            token: response.data.token,
            rememberMe: true,
          });
        } else {
          await storageService.clearRememberedEmail();
          await storageService.clearUserSession();
        }

        onSuccess(response.data.email, response.data.role, response.data.name);
      } else {

        Alert.alert('Error de acceso', response.error || 'Contraseña incorrecta. Por favor verifica tus datos.');
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      Alert.alert('Error', 'Ocurrió un error al procesar el inicio de sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordPress = () => {
    onNavigateToForgot(email.trim().toLowerCase());
  };

  const handleChangeEmail = () => {
    setLoginStep('email');
    setPassword('');
  };

  return (
    <View style={authStyles.card}>
      <View style={authStyles.welcomeBadge}>
        <Ionicons name="shield-checkmark" size={16} color="#0F613B" />
        <Text style={authStyles.welcomeBadgeText}>
          {loginStep === 'email' ? 'ACCESO SEGURO' : 'INICIAR SESIÓN'}
        </Text>
      </View>

      <Text style={authStyles.cardTitle}>
        {loginStep === 'email' ? 'Bienvenido a PsicoHábitos' : `Hola, ${userName || 'Usuario'}`}
      </Text>
      <Text style={authStyles.cardSubtitle}>
        {loginStep === 'email'
          ? 'Ingresa tu correo para continuar a tu espacio seguro'
          : 'Ingresa tu contraseña para acceder a tu cuenta'}
      </Text>

      {/* PASO 1: INGRESO DE CORREO */}
      {loginStep === 'email' ? (
        <>
          <View style={authStyles.inputGroup}>
            <Text style={authStyles.inputLabel}>Correo Electrónico</Text>
            <TextInput
              style={authStyles.input}
              placeholder="ejemplo@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={handleCheckEmailAndContinue}
            />
          </View>

          <TouchableOpacity
            style={[authStyles.submitButton, isLoading && { opacity: 0.7 }]}
            onPress={handleCheckEmailAndContinue}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={authStyles.submitButtonText}>Continuar</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        /* PASO 2: INGRESO DE CONTRASEÑA */
        <>
          {/* Chip de correo seleccionado con opción de cambiar */}
          <View style={authStyles.emailChipContainer}>
            <View style={authStyles.emailChipLeft}>
              <Ionicons name="mail-outline" size={18} color="#0F613B" />
              <Text style={authStyles.emailChipText} numberOfLines={1} ellipsizeMode="middle">
                {email}
              </Text>
            </View>
            <TouchableOpacity onPress={handleChangeEmail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={authStyles.emailChipChangeText}>Cambiar</Text>
            </TouchableOpacity>
          </View>

          {/* Campo de Contraseña */}
          <View style={authStyles.inputGroup}>
            <Text style={authStyles.inputLabel}>Contraseña</Text>
            <View style={authStyles.passwordInputWrapper}>
              <TextInput
                style={authStyles.passwordInput}
                placeholder="••••••••••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={authStyles.eyeIconButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Checkbox Recuérdame */}
          <TouchableOpacity
            style={authStyles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.8}
          >
            <View style={[authStyles.checkbox, rememberMe && authStyles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={authStyles.rememberText}>Recuérdame</Text>
          </TouchableOpacity>

          {/* Botón Principal Iniciar Sesión */}
          <TouchableOpacity
            style={[authStyles.submitButton, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={authStyles.submitButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          {/* Enlace Olvidé mi Contraseña */}
          <View style={authStyles.bottomLinksRow}>
            <TouchableOpacity onPress={handleForgotPasswordPress}>
              <Text style={authStyles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};
