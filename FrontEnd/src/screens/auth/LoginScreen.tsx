import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '../../constants/auth';
import { authService } from '../../services';
import { validatePasswordComplexity } from '../../utils/validators';
import { LegalConsentModal } from '../../components/LegalConsentModal';

interface LoginScreenProps {
  onBack: () => void;
  onLoginSuccess: (email: string, role: UserRole, name: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onBack,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para el flujo de "Crear Contraseña Inicial"
  const [isCreatingPassword, setIsCreatingPassword] = useState(false);
  const [pendingUserName, setPendingUserName] = useState('');
  const [pendingUserRole, setPendingUserRole] = useState<UserRole>('paciente');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // Reglas de complejidad para el checklist visual
  const reqLength = newPassword.trim().length >= 8;
  const reqUpper = /[A-Z]/.test(newPassword);
  const reqLower = /[a-z]/.test(newPassword);
  const reqNumber = /\d/.test(newPassword);
  const reqSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const reqMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleLogin = async () => {
    const targetEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!targetEmail) {
      Alert.alert('Email requerido', 'Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!targetEmail.includes('@')) {
      Alert.alert('Email inválido', 'El correo electrónico debe contener un "@".');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Si no ha escrito contraseña, verificar si requiere crear una
      if (!cleanPassword) {
        const check = await authService.checkEmail(targetEmail);
        if (check.exists && check.requiresPasswordCreation) {
          setIsCreatingPassword(true);
          setPendingUserName(check.name || 'Usuario');
          setPendingUserRole(check.role || 'paciente');
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
        Alert.alert('Contraseña requerida', 'Por favor ingresa tu contraseña.');
        return;
      }

      // 2. Intento de inicio de sesión normal
      const response = await authService.login(targetEmail, cleanPassword);

      if (response.requiresPasswordCreation) {
        setIsCreatingPassword(true);
        setPendingUserName(response.data?.name || 'Usuario');
        setPendingUserRole(response.data?.role || 'paciente');
        setIsLoading(false);
        return;
      }

      if (response.success && response.data) {
        onLoginSuccess(response.data.email, response.data.role, response.data.name);
      } else {
        Alert.alert('Error de acceso', response.error || 'Credenciales inválidas.');
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error al procesar el inicio de sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePassword = async () => {
    const targetEmail = email.trim().toLowerCase();
    const cleanNewPassword = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNewPassword) {
      Alert.alert('Contraseña requerida', 'Por favor ingresa una nueva contraseña.');
      return;
    }

    const complexity = validatePasswordComplexity(cleanNewPassword);
    if (!complexity.isValid) {
      Alert.alert(
        'Contraseña no cumple requisitos',
        complexity.error || 'Verifica que tu contraseña cumpla todos los requisitos de seguridad.'
      );
      return;
    }

    if (cleanNewPassword !== cleanConfirm) {
      Alert.alert('Las contraseñas no coinciden', 'Por favor confirma que ambas contraseñas sean idénticas.');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(
        'Aceptación de términos requerida',
        'Para continuar y crear tu contraseña, debes aceptar los Términos y Condiciones y la Política de Privacidad (Ley N° 21.719).'
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.createInitialPassword(targetEmail, cleanNewPassword, true);

      if (response.success && response.data) {
        Alert.alert(
          '¡Contraseña Creada!',
          'Tu acceso ha sido configurado exitosamente.',
          [
            {
              text: 'Ingresar',
              onPress: () => {
                onLoginSuccess(response.data!.email, response.data!.role, response.data!.name);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'No se pudo guardar la contraseña. Inténtalo nuevamente.');
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un fallo de conexión al crear tu contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Botón Volver */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={isCreatingPassword ? () => setIsCreatingPassword(false) : onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0F613B" />
          </TouchableOpacity>

          {/* Encabezado Institucional */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>
              <Text style={styles.titlePsico}>Psico</Text>
              <Text style={styles.titleHabitos}>Hábitos-IA</Text>
            </Text>
            <Text style={styles.sloganText}>Tu bienestar, un día a la vez.</Text>
          </View>

          {/* VISTA 1: CREAR CONTRASEÑA INICIAL (Primer Acceso) */}
          {isCreatingPassword ? (
            <View style={styles.card}>
              <View style={styles.welcomeBadge}>
                <Ionicons name="key-outline" size={22} color="#0F613B" />
                <Text style={styles.welcomeBadgeText}>PRIMER ACCESO AL SISTEMA</Text>
              </View>

              <Text style={styles.cardTitle}>Crear Contraseña</Text>
              <Text style={styles.cardSubtitle}>
                ¡Hola <Text style={{ fontWeight: '700', color: '#0F613B' }}>{pendingUserName}</Text>! Tu cuenta ha sido dada de alta. Define tu contraseña personal para acceder.
              </Text>

              {/* Email (solo lectura) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <View style={[styles.input, styles.inputDisabled]}>
                  <Text style={styles.inputDisabledText}>{email.trim().toLowerCase()}</Text>
                </View>
              </View>

              {/* Nueva Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nueva Contraseña</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#9CA3AF"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeIconButton}
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
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeIconButton}
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
              <View style={styles.requirementsBox}>
                <Text style={styles.requirementsTitle}>Requisitos de seguridad:</Text>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={reqLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={reqLength ? '#0F613B' : '#9CA3AF'}
                  />
                  <Text style={[styles.reqText, reqLength && styles.reqTextActive]}>
                    Mínimo 8 caracteres
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={reqUpper ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={reqUpper ? '#0F613B' : '#9CA3AF'}
                  />
                  <Text style={[styles.reqText, reqUpper && styles.reqTextActive]}>
                    Al menos una letra mayúscula (A-Z)
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={reqLower ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={reqLower ? '#0F613B' : '#9CA3AF'}
                  />
                  <Text style={[styles.reqText, reqLower && styles.reqTextActive]}>
                    Al menos una letra minúscula (a-z)
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={reqNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={reqNumber ? '#0F613B' : '#9CA3AF'}
                  />
                  <Text style={[styles.reqText, reqNumber && styles.reqTextActive]}>
                    Al menos un número (0-9)
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={reqSpecial ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={reqSpecial ? '#0F613B' : '#9CA3AF'}
                  />
                  <Text style={[styles.reqText, reqSpecial && styles.reqTextActive]}>
                    Al menos un carácter especial (ej. @, #, $, !)
                  </Text>
                </View>
                {confirmPassword.length > 0 && (
                  <View style={styles.reqRow}>
                    <Ionicons
                      name={reqMatch ? 'checkmark-circle' : 'close-circle-outline'}
                      size={16}
                      color={reqMatch ? '#0F613B' : '#DC2626'}
                    />
                    <Text style={[styles.reqText, reqMatch ? styles.reqTextActive : { color: '#DC2626' }]}>
                      {reqMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Respaldo Legal de Consentimiento (Ley N° 21.719) */}
              <View style={styles.termsAgreementBox}>
                <TouchableOpacity
                  style={styles.termsCheckboxRow}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.termsCheckbox, acceptedTerms && styles.termsCheckboxChecked]}>
                    {acceptedTerms && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                  </View>
                  <View style={styles.termsTextContainer}>
                    <Text style={styles.termsAgreementText}>
                      He leído y acepto la{' '}
                      <Text
                        style={styles.termsLinkText}
                        onPress={() => setTermsModalVisible(true)}
                      >
                        Protección de Datos y Confidencialidad (Ley N° 21.719)
                      </Text>
                      .
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.termsInfoButton}
                  onPress={() => setTermsModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="shield-checkmark-outline" size={15} color="#0F613B" />
                  <Text style={styles.termsInfoButtonText}>
                    Ver términos legales y resguardo de confidencialidad
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Botón Guardar e Ingresar */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!acceptedTerms || isLoading) && styles.submitButtonDisabled,
                ]}
                onPress={handleCreatePassword}
                activeOpacity={acceptedTerms ? 0.85 : 0.95}
                disabled={isLoading || !acceptedTerms}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Guardar Contraseña e Ingresar</Text>
                )}
              </TouchableOpacity>

              {/* Volver */}
              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => setIsCreatingPassword(false)}
              >
                <Text style={styles.cancelLinkText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* VISTA 2: INICIO DE SESIÓN REGULAR */
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Iniciar Sesión</Text>
              <Text style={styles.cardSubtitle}>Inicie sesión para continuar</Text>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
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
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••••••••••"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeIconButton}
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
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberText}>Recuérdame</Text>
              </TouchableOpacity>

              {/* Botón Principal Entrar */}
              <TouchableOpacity
                style={[styles.submitButton, isLoading && { opacity: 0.7 }]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Entrar</Text>
                )}
              </TouchableOpacity>

              {/* Enlace Recuperar Contraseña */}
              <View style={styles.bottomLinksRow}>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'Recuperar Contraseña',
                      'Te enviaremos un enlace de recuperación a tu correo electrónico registrado.'
                    )
                  }
                >
                  <Text style={styles.forgotPasswordText}>¿Has olvidado tu contraseña?</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <LegalConsentModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
        onAccept={() => setAcceptedTerms(true)}
        showAcceptButton={!acceptedTerms}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  titlePsico: {
    color: '#0E5C3A',
  },
  titleHabitos: {
    color: '#268D77',
  },
  sloganText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0E5C3A',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 14,
    alignSelf: 'center',
  },
  welcomeBadgeText: {
    color: '#0F613B',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  inputDisabledText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  eyeIconButton: {
    padding: 6,
  },
  requirementsBox: {
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  requirementsTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 8,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  reqText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  reqTextActive: {
    color: '#0F613B',
    fontWeight: '600',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#0F613B',
    borderColor: '#0F613B',
  },
  rememberText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#0F613B',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#0F613B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '600',
  },
  bottomLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9FB8AA',
    shadowOpacity: 0.05,
    elevation: 0,
  },
  termsAgreementBox: {
    backgroundColor: '#F2F8F4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D3E6DC',
  },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  termsCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0F613B',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  termsCheckboxChecked: {
    backgroundColor: '#0F613B',
    borderColor: '#0F613B',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsAgreementText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  termsLinkText: {
    color: '#0F613B',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#DEEBE3',
  },
  termsInfoButtonText: {
    fontSize: 12,
    color: '#0F613B',
    fontWeight: '600',
  },
  forgotPasswordText: {
    fontSize: 13.5,
    color: '#0E5C3A',
    fontWeight: '600',
    textAlign: 'center',
  },
});
