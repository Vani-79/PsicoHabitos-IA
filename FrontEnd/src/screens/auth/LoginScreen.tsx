import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserRole } from '../../constants/auth';
import { LegalConsentModal } from '../../components/LegalConsentModal';
import {
  LoginForm,
  CreateInitialPasswordCard,
  ForgotEmailCard,
  ForgotCodeCard,
  ForgotResetPasswordCard,
  ActivationCodeCard,
} from './components';

export type AuthViewMode =
  | 'login'
  | 'activation_code'
  | 'create_initial_password'
  | 'forgot_email'
  | 'forgot_code'
  | 'forgot_reset';

interface LoginScreenProps {
  onBack?: () => void;
  onLoginSuccess: (
    email: string,
    role: UserRole,
    name: string,
    token?: string,
    rememberMe?: boolean
  ) => void;
}


export const LoginScreen: React.FC<LoginScreenProps> = ({
  onBack,
  onLoginSuccess,
}) => {
  const [authView, setAuthView] = useState<AuthViewMode>('login');
  const [activeEmail, setActiveEmail] = useState('');
  const [pendingUserName, setPendingUserName] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const handleTopBack = () => {
    switch (authView) {
      case 'activation_code':
      case 'create_initial_password':
      case 'forgot_email':
        setAuthView('login');
        break;
      case 'forgot_code':
        setAuthView('forgot_email');
        break;
      case 'forgot_reset':
        setAuthView('forgot_code');
        break;
      case 'login':
      default:
        onBack?.();
        break;
    }
  };

  // Gestión de botón físico / gesto nativo 'Atrás' de Android
  useEffect(() => {
    const onHardwareBack = () => {
      if (authView !== 'login') {
        handleTopBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBack
    );
    return () => backHandler.remove();
  }, [authView]);

  const renderAuthCard = () => {
    switch (authView) {
      case 'activation_code':
        return (
          <ActivationCodeCard
            email={activeEmail}
            userName={pendingUserName}
            onSuccess={() => {
              setAuthView('create_initial_password');
            }}
            onBackToEmail={() => setAuthView('login')}
          />
        );
      case 'create_initial_password':
        return (
          <CreateInitialPasswordCard
            email={activeEmail}
            userName={pendingUserName}
            acceptedTerms={acceptedTerms}
            setAcceptedTerms={setAcceptedTerms}
            onOpenTermsModal={() => setTermsModalVisible(true)}
            onSuccess={onLoginSuccess}
            onBackToLogin={() => setAuthView('login')}
          />
        );
      case 'forgot_email':
        return (
          <ForgotEmailCard
            initialEmail={activeEmail}
            onSuccess={(email) => {
              setActiveEmail(email);
              setAuthView('forgot_code');
            }}
            onBackToLogin={() => setAuthView('login')}
          />
        );
      case 'forgot_code':
        return (
          <ForgotCodeCard
            email={activeEmail}
            onSuccess={(code) => {
              setRecoveryCode(code);
              setAuthView('forgot_reset');
            }}
            onBackToEmail={() => setAuthView('forgot_email')}
            onBackToLogin={() => setAuthView('login')}
          />
        );
      case 'forgot_reset':
        return (
          <ForgotResetPasswordCard
            email={activeEmail}
            recoveryCode={recoveryCode}
            onSuccess={onLoginSuccess}
            onBackToLogin={() => setAuthView('login')}
          />
        );
      case 'login':
      default:
        return (
          <LoginForm
            initialEmail={activeEmail}
            onSuccess={onLoginSuccess}
            onNavigateToActivation={(email, name) => {
              setActiveEmail(email);
              setPendingUserName(name);
              setAuthView('activation_code');
            }}
            onNavigateToForgot={(email) => {
              setActiveEmail(email);
              setRecoveryCode('');
              setAuthView('forgot_email');
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior="height"
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Tarjeta con vista activa */}
          {renderAuthCard()}
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
    backgroundColor: '#FFFFFF',
  },
  flexContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 60,
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
});
