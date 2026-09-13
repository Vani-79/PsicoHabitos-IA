import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface PsychologistDashboardScreenProps {
  doctorName: string;
  onLogout: () => void;
  onRegisterPatient: () => void;
}

export const PsychologistDashboardScreen: React.FC<PsychologistDashboardScreenProps> = ({
  doctorName,
  onLogout,
  onRegisterPatient,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Barra Superior */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.portalTag}>PORTAL DEL ESPECIALISTA</Text>
          <Text style={styles.doctorName}>{doctorName}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="log-out-outline" size={22} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Contenedor Principal con el Botón de Registrar Nuevo Paciente */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.registerPatientButton}
            onPress={onRegisterPatient}
            activeOpacity={0.85}
          >
            <View style={styles.buttonIconWrapper}>
              <Ionicons name="person-add" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.buttonTextWrapper}>
              <Text style={styles.registerButtonTitle}>Registrar Nuevo Paciente</Text>
              <Text style={styles.registerButtonSubtitle}>
                Crea una ficha clínica y asocia un nuevo paciente
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#A8DED3" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  portalTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#268D77',
    letterSpacing: 0.8,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  actionSection: {
    width: '100%',
  },
  registerPatientButton: {
    backgroundColor: '#0F613B',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F613B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  buttonTextWrapper: {
    flex: 1,
  },
  registerButtonTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  registerButtonSubtitle: {
    color: '#D1E7DD',
    fontSize: 12.5,
    marginTop: 3,
  },
});
