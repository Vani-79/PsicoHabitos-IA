import {
  PsychologistBottomNav,
  PsychologistTab,
} from '../../components/PsychologistBottomNav';
import React, { useState } from 'react';
import { MySqlPatientRecord } from '../../types/patient';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface PsychologistDashboardScreenProps {
  doctorName: string;
  patients: MySqlPatientRecord[];
  onLogout: () => void;
  onRegisterPatient: () => void;
  onSelectPatient: (patient: MySqlPatientRecord) => void;
}

export const PsychologistDashboardScreen: React.FC<
  PsychologistDashboardScreenProps
> = ({
  doctorName,
  patients,
  onLogout,
  onRegisterPatient,
  onSelectPatient,
}) => {
  const [activeTab, setActiveTab] =
  useState<PsychologistTab>('inicio');
  const recentPatients = patients.slice(-5).reverse();

  return (
    <SafeAreaView style={styles.container}>

      {/* Barra Superior */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.portalTag}>
            PORTAL DEL ESPECIALISTA
          </Text>

          <Text style={styles.doctorName}>
            {doctorName}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.8}
          hitSlop={{
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
          }}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color="#DC2626"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Sección de registro de pacientes */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.registerPatientButton}
            onPress={onRegisterPatient}
            activeOpacity={0.85}
          >
            <View style={styles.buttonIconWrapper}>
              <Ionicons
                name="person-add"
                size={26}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.buttonTextWrapper}>
              <Text style={styles.registerButtonTitle}>
                Registrar Nuevo Paciente
              </Text>

              <Text style={styles.registerButtonSubtitle}>
                Crea una ficha clínica y asocia un nuevo paciente
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={24}
              color="#A8DED3"
            />
          </TouchableOpacity>
        </View>

        {/* Sección de pacientes */}
        <View style={styles.patientsSection}>

          <Text style={styles.sectionTitle}>
            Pacientes
          </Text>

          <Text style={styles.sectionSubtitle}>
            {recentPatients.length > 0
              ? 'Últimos pacientes asignados a tu consulta'
              : 'Pacientes asignados a tu consulta'}
          </Text>

          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Buscar paciente..."
            placeholderTextColor="#9CA3AF"
          />

          {recentPatients.length === 0 ? (

            /* Estado vacío */
            <View style={styles.emptyStateCard}>
              <Ionicons
                name="people-outline"
                size={44}
                color="#9CA3AF"
              />

              <Text style={styles.emptyStateTitle}>
                Aún no tienes pacientes asignados
              </Text>

              <Text style={styles.emptyStateText}>
                Presiona el botón "Registrar Nuevo Paciente" de arriba
                para crear una ficha clínica y comenzar la atención.
              </Text>
            </View>

          ) : (

            /* Lista de pacientes */
            recentPatients.map((patient, index) => (
              <TouchableOpacity
                key={`${patient.email}-${index}`}
                style={styles.patientCard}
                onPress={() => onSelectPatient(patient)}
                activeOpacity={0.8}
              >

                {/* Línea verde lateral */}
                <View style={styles.patientAccent} />

                {/* Nombre */}
                <View style={styles.patientHeader}>

                  <View style={styles.patientStatusDot} />

                  <Text style={styles.patientName}>
                    {patient.nombre}{' '}
                    {patient.apellido_paterno}{' '}
                    {patient.apellido_materno}
                  </Text>

                </View>

                {/* Edad y género */}
                <Text style={styles.patientBasicInfo}>
                  {patient.edad} años · {patient.genero}
                </Text>

                {/* Última sesión */}
                <View style={styles.patientDateRow}>

                  <Text style={styles.patientDateLabel}>
                    Última sesión:
                  </Text>

                  <Text style={styles.patientDateValue}>
                    {patient.fecha_primera_sesion}
                  </Text>

                </View>

                {/* Próxima sesión */}
                <View style={styles.patientDateRow}>

                  <Text style={styles.patientDateLabel}>
                    Próxima sesión:
                  </Text>

                  <Text style={styles.patientDateValue}>
                    Pendiente
                  </Text>

                </View>

                {/* Ver ficha */}
                <View style={styles.viewPatientRow}>

                  <Text style={styles.viewPatientText}>
                    Ver ficha
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#0F613B"
                  />

                </View>

              </TouchableOpacity>
            ))

          )}

        </View>

            </ScrollView>

      <PsychologistBottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },

  /* =========================
     BARRA SUPERIOR
  ========================= */

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

  searchInput: {
  height: 46,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E3EEE9',
  borderRadius: 12,
  paddingHorizontal: 14,
  fontSize: 14,
  color: '#1F2937',
  marginBottom: 14,
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

  /* =========================
     SCROLL
  ========================= */

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },

  /* =========================
     BOTÓN REGISTRAR
  ========================= */

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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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

  /* =========================
     PACIENTES
  ========================= */

  patientsSection: {
    marginTop: 28,
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },

  sectionSubtitle: {
    marginBottom: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  /* =========================
     TARJETA PACIENTE
  ========================= */

  patientCard: {
    marginBottom: 12,
    padding: 16,

    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#6CB59388',

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

  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  patientStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#6CB593',
    marginRight: 8,
  },

  patientName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },

  patientBasicInfo: {
    marginLeft: 17,
    fontSize: 14,
    color: '#60756D',
    marginBottom: 12,
  },

  patientDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },

  patientDateLabel: {
    fontSize: 13,
    color: '#6B7280',
  },

  patientDateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  viewPatientRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },

  viewPatientText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F613B',
    marginRight: 3,
  },

  /* =========================
     ESTADO VACÍO
  ========================= */

  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',

    marginTop: 6,
  },

  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },

  emptyStateText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

});