import {
  PsychologistBottomNav,
  PsychologistTab,
} from '../../components/PsychologistBottomNav';
import React, { useState, useEffect } from 'react';
import { PsychologistProfileScreen } from './PsychologistProfileScreen';
import { PsychologistCalendarScreen } from './PsychologistCalendarScreen';
import { MySqlPatientRecord } from '../../types/patient';
import { patientService } from '../../services/patientService';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<PsychologistTab>('inicio');
  const [searchTerm, setSearchTerm] = useState('');
  const [todayPatients, setTodayPatients] = useState<MySqlPatientRecord[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTodayPatients = async () => {
      setLoadingToday(true);
      try {
        const list = await patientService.getTodayPatients(user?.email);
        if (isMounted) {
          if (list.length > 0) {
            setTodayPatients(list);
          } else {
            const todayStr = new Date().toISOString().split('T')[0];
            const localFiltered = patients.filter(
              (p) => p.fecha_primera_sesion === todayStr
            );
            setTodayPatients(localFiltered);
          }
        }
      } catch (err) {
        console.warn('[Pantallaprincipal] Error al cargar pacientes del día:', err);
      } finally {
        if (isMounted) setLoadingToday(false);
      }
    };

    fetchTodayPatients();

    return () => {
      isMounted = false;
    };
  }, [user?.email, patients]);

  // Control unificado de suscripción:
  // Si la suscripción no está activa o ya venció, se bloquean todas las acciones clínicas
  // permitiendo exclusivamente navegar entre pestañas, leer el aviso y cerrar sesión.
  const isSubscriptionActive = user?.subscription ? user.subscription.isActive : true;

  const showSubscriptionAlert = () => {
    Alert.alert(
      'Suscripción Finalizada',
      'Suscripción Finalizada comuníquese con el administrador para renovarla',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleRegisterPatientPress = () => {
    if (!isSubscriptionActive) {
      showSubscriptionAlert();
      return;
    }
    onRegisterPatient();
  };

  const handlePatientPress = (patient: MySqlPatientRecord) => {
    if (!isSubscriptionActive) {
      showSubscriptionAlert();
      return;
    }
    onSelectPatient(patient);
  };

  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const recentPatients = filteredPatients.slice(-5).reverse();

  if (activeTab === 'perfil') {
    return (
      <PsychologistProfileScreen
        doctorName={doctorName}
        onNavigateTab={setActiveTab}
        onLogout={onLogout}
      />
    );
  }

  if (activeTab === 'calendario') {
    return (
      <PsychologistCalendarScreen
        doctorName={doctorName}
        onNavigateTab={setActiveTab}
      />
    );
  }

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
      </View>

      {/* Banner de Suscripción Inactiva / Expirada */}
      {!isSubscriptionActive && (
        <View style={styles.subscriptionBanner}>
          <Ionicons name="alert-circle" size={24} color="#991B1B" />
          <View style={styles.subscriptionBannerTextWrapper}>
            <Text style={styles.subscriptionBannerTitle}>Suscripción Finalizada</Text>
            <Text style={styles.subscriptionBannerMessage}>
              Comuníquese con el administrador para renovarla
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PESTAÑA 1: INICIO */}
        {activeTab === 'inicio' && (
          <>
            {/* Sección de registro de pacientes */}
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={[
                  styles.registerPatientButton,
                  !isSubscriptionActive && styles.registerButtonDisabled,
                ]}
                onPress={handleRegisterPatientPress}
                activeOpacity={isSubscriptionActive ? 0.85 : 0.6}
              >
                <View style={styles.buttonIconWrapper}>
                  <Ionicons
                    name={isSubscriptionActive ? 'person-add' : 'lock-closed'}
                    size={26}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.buttonTextWrapper}>
                  <Text style={styles.registerButtonTitle}>
                    {isSubscriptionActive ? 'Registrar Nuevo Paciente' : 'Registrar Paciente (Bloqueado)'}
                  </Text>

                  <Text style={styles.registerButtonSubtitle}>
                    {isSubscriptionActive
                      ? 'Crea una ficha clínica y asocia un nuevo paciente'
                      : 'Suscripción finalizada: comuníquese con el administrador'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={isSubscriptionActive ? '#A8DED3' : '#FCA5A5'}
                />
              </TouchableOpacity>
            </View>

            {/* Sección de pacientes del día */}
            <View style={styles.patientsSection}>
              <Text style={styles.sectionTitle}>Pacientes del Día</Text>

              {todayPatients.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Ionicons name="calendar-outline" size={44} color="#9CA3AF" />
                  <Text style={styles.emptyStateTitle}>Sin pacientes para hoy</Text>
                  <Text style={styles.emptyStateText}>
                    No tienes consultas o citas programadas para el día de hoy.
                  </Text>
                </View>
              ) : (
                todayPatients.map((patient, index) => (
                  <TouchableOpacity
                    key={`today-${patient.email}-${index}`}
                    style={[
                      styles.patientCard,
                      !isSubscriptionActive && styles.patientCardDisabled,
                    ]}
                    onPress={() => handlePatientPress(patient)}
                    activeOpacity={isSubscriptionActive ? 0.8 : 0.6}
                  >
                    <View style={styles.patientAccent} />
                    <View style={styles.patientHeader}>
                      <View style={styles.patientStatusDot} />
                      <Text style={styles.patientName}>
                        {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno || ''}
                      </Text>
                    </View>

                    <Text style={styles.patientBasicInfo}>
                      {patient.edad} años · {patient.genero}
                    </Text>

                    {(patient as any).hora_cita ? (
                      <View style={styles.patientDateRow}>
                        <Text style={styles.patientDateLabel}>Cita programada:</Text>
                        <Text style={styles.patientDateValue}>{(patient as any).hora_cita} hrs</Text>
                      </View>
                    ) : (
                      <View style={styles.patientDateRow}>
                        <Text style={styles.patientDateLabel}>Consulta:</Text>
                        <Text style={styles.patientDateValue}>Hoy ({patient.fecha_primera_sesion || 'Agendada'})</Text>
                      </View>
                    )}

                    <View style={styles.viewPatientRow}>
                      <Text
                        style={[
                          styles.viewPatientText,
                          !isSubscriptionActive && { color: '#9CA3AF' },
                        ]}
                      >
                        {isSubscriptionActive ? 'Ver ficha' : 'Ficha bloqueada'}
                      </Text>
                      <Ionicons
                        name={isSubscriptionActive ? 'chevron-forward' : 'lock-closed'}
                        size={18}
                        color={isSubscriptionActive ? '#0F613B' : '#9CA3AF'}
                      />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {/* PESTAÑA 2: PACIENTES */}
        {activeTab === 'pacientes' && (
          <View style={styles.patientsSection}>
            <Text style={styles.sectionTitle}>Todos los Pacientes</Text>
            <Text style={styles.sectionSubtitle}>
              Listado general de pacientes ({filteredPatients.length})
            </Text>

            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Buscar paciente por nombre o email..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
              editable={isSubscriptionActive}
              onPressIn={() => {
                if (!isSubscriptionActive) showSubscriptionAlert();
              }}
            />

            {filteredPatients.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="people-outline" size={44} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>Sin pacientes registrados</Text>
              </View>
            ) : (
              filteredPatients.map((patient, index) => (
                <TouchableOpacity
                  key={`all-${patient.email}-${index}`}
                  style={[
                    styles.patientCard,
                    !isSubscriptionActive && styles.patientCardDisabled,
                  ]}
                  onPress={() => handlePatientPress(patient)}
                  activeOpacity={isSubscriptionActive ? 0.8 : 0.6}
                >
                  <View style={styles.patientAccent} />
                  <View style={styles.patientHeader}>
                    <View style={styles.patientStatusDot} />
                    <Text style={styles.patientName}>
                      {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno}
                    </Text>
                  </View>
                  <View style={styles.patientMetaContainer}>
                    <Text style={styles.patientBasicInfo}>
                      {patient.edad} años · {patient.genero ? patient.genero.charAt(0).toUpperCase() + patient.genero.slice(1) : ''}
                    </Text>
                    {patient.email ? (
                      <View style={styles.patientEmailRow}>
                        <Ionicons name="mail-outline" size={13} color="#60756D" style={{ marginRight: 5 }} />
                        <Text style={styles.patientEmailText} numberOfLines={1} ellipsizeMode="tail">
                          {patient.email}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.viewPatientRow}>
                    <Text
                      style={[
                        styles.viewPatientText,
                        !isSubscriptionActive && { color: '#9CA3AF' },
                      ]}
                    >
                      {isSubscriptionActive ? 'Ver ficha' : 'Ficha bloqueada'}
                    </Text>
                    <Ionicons
                      name={isSubscriptionActive ? 'chevron-forward' : 'lock-closed'}
                      size={18}
                      color={isSubscriptionActive ? '#0F613B' : '#9CA3AF'}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Navegación inferior con pestañas (siempre disponible) */}
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

    borderRadius: 16,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E7F0EA',

    overflow: 'hidden',
    position: 'relative',
  },

  patientAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#3FB889',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  patientStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3FB889',
    marginRight: 8,
  },

  patientName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },

  patientMetaContainer: {
    marginLeft: 17,
    marginBottom: 6,
  },

  patientBasicInfo: {
    fontSize: 13.5,
    color: '#6B8577',
    marginBottom: 3,
    fontWeight: '500',
  },

  patientEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },

  patientEmailText: {
    fontSize: 13,
    color: '#60756D',
    flexShrink: 1,
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
    color: '#1B8A5A',
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

  /* =========================
     BANNER DE SUSCRIPCIÓN
  ========================= */

  subscriptionBanner: {
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1.5,
    borderBottomColor: '#FCA5A5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  subscriptionBannerTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },

  subscriptionBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },

  subscriptionBannerMessage: {
    fontSize: 12.5,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 16,
    fontWeight: '600',
  },

  registerButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.05,
  },

  patientCardDisabled: {
    opacity: 0.75,
    borderColor: '#E5E7EB',
  },

  /* =========================
     PESTAÑA PERFIL
  ========================= */

  profileSection: {
    paddingVertical: 10,
  },

  profileAvatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5EBF0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  profileDoctorName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },

  profileDoctorEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },

  profileRoleBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },

  profileRoleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#03543F',
  },

  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5EBF0',
    marginBottom: 24,
  },

  subscriptionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  subscriptionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },

  subscriptionCardBody: {
    paddingLeft: 32,
  },

  subscriptionCardStatus: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  subscriptionCardDate: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
  },

  subscriptionCardWarning: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    lineHeight: 18,
  },

  profileLogoutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  profileLogoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

});