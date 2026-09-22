import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LegalConsentModal } from '../../components/LegalConsentModal';

interface WelcomeScreenProps {
  onStartLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartLogin }) => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Sección Superior: Logo y Marca */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          {/* Título con los colores institucionales */}
          <Text style={styles.brandTitle}>
            <Text style={styles.titlePsico}>Psico</Text>
            <Text style={styles.titleHabitos}>Hábitos-IA</Text>
          </Text>

          {/* Slogan institucional */}
          <Text style={styles.sloganText}>Tu bienestar, un día a la vez.</Text>
        </View>

        {/* Sección Media: Mini-tarjetas de beneficios clave */}
        <View style={styles.featuresSection}>
          {/* Tarjeta 1: H.O.P.E. */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Image
                source={require('../../../assets/h.o.p.e.png')}
                style={styles.hopeFeatureIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Acompañamiento H.O.P.E.</Text>
              <Text style={styles.featureDescription}>
                Asistente inteligente para apoyo emocional y reflexiones guiadas.
              </Text>
            </View>
          </View>

          {/* Tarjeta 2: Hábitos */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="sparkles" size={20} color="#0F613B" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Monitoreo de Hábitos</Text>
              <Text style={styles.featureDescription}>
                Registro diario de sueño, alimentación, hidratación, ejercicio, ansiedad y niveles de estrés.
              </Text>
            </View>
          </View>

          {/* Tarjeta 3: Conexión Terapéutica */}
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#0F613B" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Conexión Terapéutica</Text>
              <Text style={styles.featureDescription}>
                Evolución y seguimiento alineado directamente con tu psicólogo.
              </Text>
            </View>
          </View>
        </View>

        {/* Sección Inferior: Botón de Inicio y Seguridad */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={onStartLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            <Ionicons
              name="arrow-forward"
              size={22}
              color="#FFFFFF"
              style={styles.buttonIcon}
            />
          </TouchableOpacity>

          {/* Hipervínculo interactivo de términos y condiciones */}
          <TouchableOpacity
            style={styles.securityBadge}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="shield-checkmark"
              size={15}
              color="#10B981"
            />
            <Text style={styles.securityText}>
              Espacio seguro y confidencial (Ley N° 21.719)
            </Text>
          </TouchableOpacity>

          <Text style={styles.termsHintText}>
            (Toca para leer las políticas de privacidad y confidencialidad)
          </Text>
        </View>
      </ScrollView>

      {/* Pop-up / Modal: Ley 21.719 y Confidencialidad */}
      <LegalConsentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        showAcceptButton={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 24,
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  logoImage: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 28,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#0E5C3A',
    marginTop: 4,
    textAlign: 'center',
  },
  featuresSection: {
    width: '100%',
    marginVertical: 18,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAF8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2EBE5',
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  featureIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hopeFeatureIcon: {
    width: 26,
    height: 26,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F613B',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: '#526058',
    lineHeight: 16,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: '#0F613B',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#0F613B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonDisabled: {
    backgroundColor: '#C2D6CC',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  loginButtonTextDisabled: {
    color: '#EDF4F0',
  },
  buttonIcon: {
    marginLeft: 4,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  securityBadgePending: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityBadgeAccepted: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  securityText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  securityTextPending: {
    color: '#059669',
    textDecorationLine: 'underline',
  },
  securityTextAccepted: {
    color: '#8E9E96',
    textDecorationLine: 'none',
  },
  termsHintText: {
    fontSize: 11,
    color: '#8E9E96',
    marginTop: 4,
    textAlign: 'center',
  },

  // Estilos del Modal / Pop-up
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F613B',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalLawBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4EDE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 16,
  },
  modalLawBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F613B',
  },
  modalContentBox: {
    width: '100%',
    backgroundColor: '#F7FAF8',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2EBE5',
  },
  modalParagraph: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
  },
  modalBoldText: {
    fontWeight: '700',
    color: '#0F613B',
  },
  modalAcceptButton: {
    backgroundColor: '#0F613B',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  modalAcceptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCloseButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
});
