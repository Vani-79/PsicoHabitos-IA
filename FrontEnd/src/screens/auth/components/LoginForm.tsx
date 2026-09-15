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
import { authStyles } from './authStyles';

interface LoginFormProps {
  initialEmail?: string;
  onSuccess: (email: string, role: UserRole, name: string) => void;
  onNavigateToCreatePassword: (email: string, name: string) => void;
  onNavigateToForgot: (email: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  initialEmail = '',
  onSuccess,
  onNavigateToCreatePassword,
  onNavigateToForgot,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateInput = (targetEmail: string): boolean => {
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

  const checkPasswordlessLogin = async (targetEmail: string): Promise<boolean> => {
    const check = await authService.checkEmail(targetEmail);
    if (check.exists && check.requiresPasswordCreation) {
      onNavigateToCreatePassword(targetEmail, check.name || 'Usuario');
      return true;
    }
    Alert.alert('Contraseña requerida', 'Por favor ingresa tu contraseña.');
    return false;
  };

  const handleLogin = async () => {
    const targetEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!validateInput(targetEmail)) {
      return;
    }

    setIsLoading(true);

    try {
      if (!cleanPassword) {
        await checkPasswordlessLogin(targetEmail);
        return;
      }

      const response = await authService.login(targetEmail, cleanPassword);

      if (response.requiresPasswordCreation) {
        onNavigateToCreatePassword(targetEmail, response.data?.name || 'Usuario');
        return;
      }

      if (response.success && response.data) {
        onSuccess(response.data.email, response.data.role, response.data.name);
      } else {
        Alert.alert('Error de acceso', response.error || 'Credenciales inválidas.');
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

  return (
    <View style={authStyles.card}>
      <Text style={authStyles.cardTitle}>Iniciar Sesión</Text>
      <Text style={authStyles.cardSubtitle}>Inicie sesión para continuar</Text>

      {/* Email */}
      <View style={authStyles.inputGroup}>
        <Text style={authStyles.inputLabel}>Email</Text>
        <TextInput
          style={authStyles.input}
          placeholder="ejemplo@email.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Contraseña */}
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

      {/* Botón Principal Entrar */}
      <TouchableOpacity
        style={[authStyles.submitButton, isLoading && { opacity: 0.7 }]}
        onPress={handleLogin}
        activeOpacity={0.85}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={authStyles.submitButtonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      {/* Enlace Recuperar Contraseña */}
      <View style={authStyles.bottomLinksRow}>
        <TouchableOpacity onPress={handleForgotPasswordPress}>
          <Text style={authStyles.forgotPasswordText}>¿Has olvidado tu contraseña?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
