import React from 'react';
import { MySqlPatientRecord } from '../../types/patient';
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
  patients: MySqlPatientRecord[];
  onLogout: () => void;
  onRegisterPatient: () => void;
}

export const PsychologistDashboardScreen: React.FC<PsychologistDashboardScreenProps> = ({
  doctorName,
  patients,
  onLogout,
  onRegisterPatient,
}) => {
  const recentPatients = patients.slice(-5).reverse();
  
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
        {/* Sección de registro de pacientes */}
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

        {/* Sección de Pacientes Registrados */}
        <View style={styles.patientsSection}>
        <Text style={styles.sectionTitle}>Pacientes recientes</Text>
        <Text style={styles.sectionSubtitle}>Últimos 5 pacientes registrados</Text>
        {recentPatients.map((patient, index) => (
    <View
      key={`${patient.email}-${index}`}
      style={styles.patientCard}
    >
      <View style={styles.patientAccent} />
      <Text style={styles.patientName}>
        {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno}
      </Text>

      <Text style={styles.patientDetail}>
        {patient.edad} años
      </Text>

      <Text style={styles.patientDetail}>
        Correo: {patient.email}
      </Text>

      <Text style={styles.patientDetail}>
        Primera sesión: {patient.fecha_primera_sesion}
      </Text>
    </View>
  ))}
</View>
      </ScrollView>
    </SafeAreaView>
  );
};



const styles = StyleSheet.create({
  patientsSection: {
  marginTop: 28,
},

sectionSubtitle: {
  marginBottom: 12,
  fontSize: 14,
  color: '#6B7280',
},

sectionTitle: {
  marginBottom: 12,
  fontSize: 20,
  fontWeight: '800',
  color: '#1F2937',
},

patientCard: {
  marginBottom: 12,
  padding: 16,
  borderTopRightRadius: 16,
  borderBottomRightRadius: 16,
  borderTopLeftRadius: 0,
  borderBottomLeftRadius: 0,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#6cb59388',
  overflow: 'hidden',
  position: 'relative',
},

patientAccent: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 8,
  backgroundColor: '#6CB593',
},

patientName: {
  fontSize: 16,
  fontWeight: '700',
  color: '#1F2937',
},

patientDetail: {
  marginTop: 5,
  fontSize: 14,
  color: '#60756D',
},
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
