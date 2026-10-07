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

// Iniciales del paciente para el círculo de la agenda (ej: "Lucía Fernández" → "LF")
const getInitials = (p: MySqlPatientRecord) =>
  `${p.nombre?.charAt(0) ?? ''}${p.apellido_paterno?.charAt(0) ?? ''}`.toUpperCase();

// Colores suaves para las iniciales del directorio de pacientes
const AVATAR_COLORS = [
  { bg: '#E6EEF8', fg: '#2F5A8A' }, // azul
  { bg: '#F5ECE4', fg: '#8A5A2F' }, // arena
  { bg: '#EEEAF6', fg: '#5A4A8A' }, // lavanda
  { bg: '#E8F5EE', fg: '#0F613B' }, // verde
  { bg: '#F8E8EC', fg: '#8A3A4F' }, // rosa
  { bg: '#E6F3F4', fg: '#2F6F75' }, // turquesa
];

// Siempre devuelve el mismo color para el mismo paciente (se calcula con su nombre)
const getAvatarColor = (p: MySqlPatientRecord) => {
  const key = `${p.nombre ?? ''}${p.apellido_paterno ?? ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

// Fecha de hoy en formato "2026-09-28", usando la hora local del teléfono
// (toISOString usa UTC y en la noche puede devolver el día siguiente)
const getLocalToday = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Paciente nuevo: su primera sesión es hoy o en el futuro (fechas en formato "2026-03-15")
const isNewPatient = (fecha?: string | null) => {
  if (!fecha || fecha.length < 10) return false;
  return fecha.slice(0, 10) >= getLocalToday();
};

// Orden alfabético por nombre, luego apellido paterno y apellido materno (reglas del español)
const comparePatientsByName = (a: MySqlPatientRecord, b: MySqlPatientRecord) => {
  const fields: (keyof MySqlPatientRecord)[] = ['nombre', 'apellido_paterno', 'apellido_materno'];
  for (const field of fields) {
    const result = String(a[field] ?? '').localeCompare(String(b[field] ?? ''), 'es', {
      sensitivity: 'base',
    });
    if (result !== 0) return result;
  }
  return 0;
};

// Con menos de esta cantidad de pacientes se muestra el mensaje en el espacio libre de la tarjeta
const FEW_PATIENTS_LIMIT = 4;

// Desde cuántos pacientes se muestran las letras de grupo (A, B, C…)
const MIN_PATIENTS_FOR_LETTERS = 8;

// Letra del grupo: inicial del nombre en mayúscula y sin tilde ("Álvaro" → "A"; la Ñ se mantiene)
const getGroupLetter = (p: MySqlPatientRecord) => {
  const first = (p.nombre?.trim().charAt(0) ?? '').toUpperCase();
  const withoutAccent: Record<string, string> = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U' };
  return withoutAccent[first] ?? (first || '#');
};

// Saludo e ícono según la hora del teléfono (solo visual, no afecta ninguna lógica)
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Buenos días,', icon: 'sunny-outline' as const };
  if (h < 20) return { text: 'Buenas tardes,', icon: 'partly-sunny-outline' as const };
  return { text: 'Buenas noches,', icon: 'moon-outline' as const };
};

// Normaliza texto para búsquedas: quita tildes/acentos y pasa a minúsculas ("Álvaro" -> "alvaro")
const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();


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
          setTodayPatients(list);
        }
      } catch (err) {
        console.warn('[Pantallaprincipal] Error al cargar pacientes del día:', err);
        if (isMounted) {
          const todayStr = getLocalToday();
          const localFiltered = patients.filter(
            (p) => p.fecha_primera_sesion === todayStr
          );
          setTodayPatients(localFiltered);
        }
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

  const normalizedSearch = normalizeText(searchTerm.trim());
  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.nombre ?? ''} ${p.apellido_paterno ?? ''} ${p.apellido_materno ?? ''}`;
    // Solo por nombre y apellidos, insensible a mayúsculas y tildes
    return normalizeText(fullName).includes(normalizedSearch);
  });

  const greeting = getGreeting();
  const todayEmails = new Set(todayPatients.map((p) => p.email));
  const sortedPatients = [...filteredPatients].sort(comparePatientsByName);
  // Se calcula con el total de pacientes (no con la búsqueda) para que las letras no aparezcan y desaparezcan al escribir
  const showLetterGroups = patients.length >= MIN_PATIENTS_FOR_LETTERS;
  const showFewPatientsHint = patients.length < FEW_PATIENTS_LIMIT && !searchTerm.trim();

  // Mensaje centrado en el espacio libre de la tarjeta de Pacientes
  const renderPatientsHint = (isEmpty: boolean) => (
    <View style={styles.patientsHint}>
      <View style={styles.patientsHintIcon}>
        <Ionicons name="people-outline" size={26} color="#3FB889" />
      </View>
      <Text style={styles.patientsHintTitle}>
        {isEmpty ? 'Tu lista está vacía por ahora' : 'Tu lista crece aquí'}
      </Text>
      <Text style={styles.patientsHintText}>
        Cada persona que registres desde Inicio aparecerá aquí, en orden alfabético.
      </Text>
    </View>
  );

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
        contentContainerStyle={[
          styles.scrollContent,
          activeTab === 'pacientes' && styles.scrollContentPatients,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* PESTAÑA 1: INICIO */}
        {activeTab === 'inicio' && (
          <>
            {/* Tarjeta de saludo */}
            <View style={styles.greetingCard}>
              <View style={styles.greetingTextWrapper}>
                <Text style={styles.greetingText}>{greeting.text}</Text>
                <Text style={styles.doctorName} numberOfLines={1}>
                  {doctorName}
                </Text>
              </View>
              <View style={styles.greetingIconCircle}>
                <Ionicons name={greeting.icon} size={22} color="#3FB889" />
              </View>
            </View>

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
                <View
                  style={[
                    styles.buttonIconWrapper,
                    !isSubscriptionActive && styles.buttonIconWrapperDisabled,
                  ]}
                >
                  <Ionicons
                    name={isSubscriptionActive ? 'add' : 'lock-closed'}
                    size={18}
                    color={isSubscriptionActive ? '#0F613B' : '#9CA3AF'}
                  />
                </View>

                <Text
                  style={[
                    styles.registerButtonTitle,
                    !isSubscriptionActive && styles.registerButtonTitleDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {isSubscriptionActive ? 'Registrar nuevo paciente' : 'Registro bloqueado'}
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isSubscriptionActive ? '#3FB889' : '#D1D5DB'}
                />
              </TouchableOpacity>
            </View>

            {/* Sección de pacientes del día: una tarjeta grande con cada cita separada */}
            <View style={[styles.patientsSection, styles.agendaCard]}>
              <View style={styles.agendaHeader}>
                <Text style={styles.agendaTitle}>Agenda de hoy</Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('calendario')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.agendaLink}>Ver calendario</Text>
                </TouchableOpacity>
              </View>

              {todayPatients.length === 0 ? (
                <View style={styles.agendaEmpty}>
                  <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
                  <Text style={styles.emptyStateTitle}>Sin sesiones hoy</Text>
                  <Text style={styles.emptyStateText}>
                    No tienes consultas o citas programadas para el día de hoy.
                  </Text>
                </View>
              ) : (
                todayPatients.map((patient, index) => {
                  const hora = patient.hora_cita;
                  const isLast = index === todayPatients.length - 1;

                  return (
                    <TouchableOpacity
                      key={`today-${patient.id ?? patient.email}`}
                      style={[
                        styles.agendaRow,
                        !isLast && styles.agendaRowSpacing,
                        !isSubscriptionActive && styles.agendaRowDisabled,
                      ]}
                      onPress={() => handlePatientPress(patient)}
                      activeOpacity={isSubscriptionActive ? 0.7 : 0.6}
                    >
                      <Text style={styles.agendaTime}>
                        {hora ? hora.slice(0, 5) : 'Hoy'}
                      </Text>

                      {/* Mismo color por paciente que en la lista de Pacientes */}
                      <View style={[styles.agendaAvatar, { backgroundColor: getAvatarColor(patient).bg }]}>
                        <Text style={[styles.agendaAvatarText, { color: getAvatarColor(patient).fg }]}>
                          {getInitials(patient)}
                        </Text>
                      </View>

                      <View style={styles.agendaInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text
                            style={[
                              styles.agendaName,
                              patient.estado_cita === 'cancelada' && styles.agendaNameCancelled,
                            ]}
                            numberOfLines={1}
                          >
                            {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno || ''}
                          </Text>
                          {(patient.rol_cita === 'suplente' || patient.tipo_relacion === 'suplente') && (
                            <View style={styles.suplenteBadge}>
                              <Text style={styles.suplenteBadgeText}>Suplencia</Text>
                            </View>
                          )}
                          {patient.tipo_relacion === 'titular' && Boolean(patient.suplente_activo) && (
                            <View style={styles.enSuplenciaBadge}>
                              <Text style={styles.enSuplenciaBadgeText}>En suplencia</Text>
                            </View>
                          )}
                          {patient.estado_cita === 'cancelada' && (
                            <View style={styles.canceladaBadge}>
                              <Text style={styles.canceladaBadgeText}>Cancelada</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.agendaMeta} numberOfLines={1}>
                          {patient.edad} años · {patient.genero}
                          {patient.estado_cita === 'cancelada' ? ' · Cita cancelada' : ''}
                        </Text>
                      </View>

                      <Ionicons
                        name={isSubscriptionActive ? 'chevron-forward' : 'lock-closed'}
                        size={16}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* PESTAÑA 2: PACIENTES: título, buscador y lista dentro de una sola tarjeta */}
        {activeTab === 'pacientes' && (
          <View
            style={[
              styles.patientsSection,
              styles.allPatientsSection,
              styles.directoryPanel,
              !showLetterGroups && styles.directoryPanelNoLetters,
            ]}
          >
            <View style={styles.directoryHeader}>
              <Text style={styles.directoryTitle}>Mis pacientes</Text>
              <Text style={styles.directoryCount}>
                {patients.length === 1 ? '1 registrado' : `${patients.length} registrados`}
              </Text>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o apellido"
                placeholderTextColor="#9CA3AF"
                value={searchTerm}
                onChangeText={setSearchTerm}
                editable={isSubscriptionActive}
                onPressIn={() => {
                  if (!isSubscriptionActive) showSubscriptionAlert();
                }}
              />
            </View>

            {patients.length === 0 ? (
              renderPatientsHint(true)
            ) : filteredPatients.length === 0 ? (
              <View style={styles.directoryEmpty}>
                <Ionicons name="search-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>Sin resultados para tu búsqueda</Text>
              </View>
            ) : (
              <>
                  {sortedPatients.map((patient, index) => {
                    const avatarColor = getAvatarColor(patient);
                    const hasSessionToday = todayEmails.has(patient.email);
                    const isNew = isNewPatient(patient.fecha_primera_sesion);
                    // "Sesión hoy" tiene prioridad sobre "Nuevo" por ser lo más urgente
                    const highlight = hasSessionToday ? 'Sesión hoy' : isNew ? 'Nuevo' : null;

                    const letter = getGroupLetter(patient);
                    const showLetter =
                      showLetterGroups &&
                      (index === 0 || getGroupLetter(sortedPatients[index - 1]) !== letter);

                    return (
                      <React.Fragment key={`all-${patient.id ?? patient.email}`}>
                        {showLetter && <Text style={styles.directoryLetter}>{letter}</Text>}

                        <TouchableOpacity
                          style={[
                            styles.directoryCard,
                            !isSubscriptionActive && styles.directoryCardDisabled,
                          ]}
                          onPress={() => handlePatientPress(patient)}
                          activeOpacity={isSubscriptionActive ? 0.8 : 0.6}
                        >
                          <View style={[styles.directoryAvatar, { backgroundColor: avatarColor.bg }]}>
                            <Text style={[styles.directoryAvatarText, { color: avatarColor.fg }]}>
                              {getInitials(patient)}
                            </Text>
                          </View>

                          <View style={styles.directoryInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.directoryName} numberOfLines={1}>
                                {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno || ''}
                              </Text>
                              {patient.tipo_relacion === 'suplente' && (
                                <View style={styles.suplenteBadge}>
                                  <Text style={styles.suplenteBadgeText}>Suplencia</Text>
                                </View>
                              )}
                              {patient.tipo_relacion === 'titular' && Boolean(patient.suplente_activo) && (
                                <View style={styles.enSuplenciaBadge}>
                                  <Text style={styles.enSuplenciaBadgeText}>En suplencia</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.directoryMeta} numberOfLines={1}>
                              {patient.edad} años
                              {highlight && (
                                <>
                                  {' · '}
                                  <Text style={styles.directoryHighlight}>{highlight}</Text>
                                </>
                              )}
                            </Text>
                          </View>

                          <Ionicons
                            name={isSubscriptionActive ? 'chevron-forward' : 'lock-closed'}
                            size={16}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}

                {showFewPatientsHint && renderPatientsHint(false)}
              </>
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

// Sombra suave compartida para las tarjetas grandes (saludo, agenda y pacientes).
// En Android, elevation dibuja una sombra gris; si se ve muy marcada, se puede quitar.
const softShadow = {
  shadowColor: '#0F613B',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 1,
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },

  /* =========================
     TARJETA DE SALUDO
  ========================= */

  greetingCard: {
    ...softShadow,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7F0EA',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  greetingTextWrapper: {
    flex: 1,
    marginRight: 12,
  },

  greetingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B8577',
  },

  greetingIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchBox: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E3EEE9',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#1F2937',
  },

  doctorName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },

  /* =========================
     SCROLL
  ========================= */

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // En Pacientes la tarjeta llega casi hasta la barra inferior
  scrollContentPatients: {
    paddingBottom: 16,
  },

  /* =========================
     BOTÓN REGISTRAR
  ========================= */

  actionSection: {
    width: '100%',
  },

  registerPatientButton: {
    backgroundColor: '#F3FAF6',
    borderWidth: 1,
    borderColor: '#D3EBDD',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  buttonIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#E2F3E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  buttonIconWrapperDisabled: {
    backgroundColor: '#E5E7EB',
  },

  registerButtonTitle: {
    flex: 1,
    color: '#0F613B',
    fontSize: 15,
    fontWeight: '600',
  },

  registerButtonTitleDisabled: {
    color: '#9CA3AF',
  },

  /* =========================
     PACIENTES
  ========================= */

  patientsSection: {
    marginTop: 28,
  },

  // En la pestaña "Pacientes" no hay botón arriba, así que se quita el margen superior
  allPatientsSection: {
    marginTop: 0,
  },

  /* =========================
     AGENDA DE HOY
  ========================= */

  agendaCard: {
    ...softShadow,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7F0EA',
    borderRadius: 16,
    padding: 12,
  },

  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  agendaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },

  agendaLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1B8A5A',
  },

  agendaEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
  },

  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAF9', // mismo gris verdoso que la lista de pacientes
    borderWidth: 1,
    borderColor: '#D9E4DE',
    borderRadius: 12,
  },

  agendaRowSpacing: {
    marginBottom: 8,
  },

  agendaRowDisabled: {
    opacity: 0.6,
  },

  agendaTime: {
    width: 48,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F613B',
  },

  agendaAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  agendaAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F7A64',
  },

  agendaInfo: {
    flex: 1,
    marginRight: 8,
  },

  agendaName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },

  agendaMeta: {
    fontSize: 13,
    color: '#6B8577',
    marginTop: 2,
  },

  /* =========================
     DIRECTORIO DE PACIENTES
  ========================= */

  directoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 22,
    paddingHorizontal: 4,
  },

  directoryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
  },

  directoryCount: {
    fontSize: 12.5,
    color: '#6B8577',
  },

  // Tarjeta grande: título, buscador y lista
  directoryPanel: {
    ...softShadow,
    flex: 1, // ocupa todo el alto disponible aunque haya pocos pacientes
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7F0EA',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 4,
  },

  // Sin letras de grupo, un poco más de aire bajo el buscador
  directoryPanelNoLetters: {
    paddingBottom: 6,
  },

  // Mensaje en el espacio libre: ocupa el resto del alto y queda centrado
  patientsHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  patientsHintIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  patientsHintTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },

  patientsHintText: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },

  directoryEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },

  // Letra de cada grupo alfabético (A, B, C…)
  directoryLetter: {
    marginTop: 10,
    marginBottom: 6,
    marginHorizontal: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  // Cada paciente, en gris verdoso claro
  directoryCard: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#D9E4DE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  directoryCardDisabled: {
    opacity: 0.6,
  },

  directoryAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  directoryAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },

  directoryInfo: {
    flex: 1,
    marginRight: 8,
  },

  directoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },

  directoryMeta: {
    fontSize: 13,
    color: '#6B8577',
    marginTop: 2,
  },

  directoryHighlight: {
    color: '#1B8A5A',
    fontWeight: '700',
  },

  /* =========================
     ESTADO VACÍO
  ========================= */

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
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },

  suplenteBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  suplenteBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  enSuplenciaBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  enSuplenciaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  canceladaBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  canceladaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  agendaNameCancelled: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
});