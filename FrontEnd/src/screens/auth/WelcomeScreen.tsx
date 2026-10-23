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
import { AUTH_COLORS } from './components/authStyles';

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
              <Ionicons name="sparkles" size={20} color={AUTH_COLORS.green} />
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
              <Ionicons name="shield-checkmark" size={20} color={AUTH_COLORS.green} />
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
              color={AUTH_COLORS.white}
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
              color={AUTH_COLORS.greenBright}
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
    backgroundColor: AUTH_COLORS.white,
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
    color: AUTH_COLORS.greenDark,
  },
  titleHabitos: {
    color: AUTH_COLORS.greenLight,
  },
  sloganText: {
    fontSize: 15,
    fontWeight: '600',
    color: AUTH_COLORS.greenDark,
    marginTop: 4,
    textAlign: 'center',
  },
  featuresSection: {
    width: '95%',
    marginVertical: 18,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AUTH_COLORS.welcomeBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AUTH_COLORS.welcomeBorder,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 8,
    shadowColor: AUTH_COLORS.black,
    shadowRadius: 3,
    elevation: 1,
  },
  featureIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 19,
    backgroundColor: AUTH_COLORS.greenSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 12,
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
    color: AUTH_COLORS.green,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: AUTH_COLORS.greenMutedText,
    lineHeight: 16,
  },
 buttonSection: {
    width: '100%', // Ancho completo para dar espacio a los elementos hijos
    alignSelf: 'center',
    alignItems: 'center', // Mantiene el botón de inicio de sesión centrado
    marginTop: 8,
  },
  loginButton: {
    backgroundColor: AUTH_COLORS.green,
    width: '50%', // Define el ancho deseado para el botón (o 200, etc.)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: AUTH_COLORS.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonText: {
    color: AUTH_COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,

  },
  securityBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  securityText: {
    fontSize: 12.5,
    fontWeight: '600',
    alignSelf: 'flex-start',
    textAlign: 'left',
  },
  termsHintText: {
    fontSize: 11,
    color: AUTH_COLORS.grayGreen,
    marginTop: 4,
  },
});
