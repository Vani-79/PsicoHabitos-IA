import React, { useState, useEffect } from 'react';
import {
  PsychologistBottomNav,
  PsychologistTab,
} from '../../components/PsychologistBottomNav';
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
import { PSYCHOLOGIST_COLORS } from './psychologistColors';

interface PsychologistDashboardScreenProps {
  doctorName: string;
  patients: MySqlPatientRecord[];
  onLogout: () => void;
  onRegisterPatient: () => void;
  onSelectPatient: (patient: MySqlPatientRecord) => void;
}

const HOME_COLORS = PSYCHOLOGIST_COLORS.inicio;
const PATIENTS_COLORS = PSYCHOLOGIST_COLORS.pacientes;

// Iniciales del paciente para el círculo de la agenda (ej: "Lucía Fernández" → "LF")
const getInitials = (p: MySqlPatientRecord) =>
  `${p.nombre?.charAt(0) ?? ''}${p.apellido_paterno?.charAt(0) ?? ''}`.toUpperCase();

// Colores suaves para las iniciales del directorio de pacientes
const HOME_AVATAR_COLORS = [
  { bg: HOME_COLORS.avatarColors.blue.background, fg: HOME_COLORS.avatarColors.blue.text },
  { bg: HOME_COLORS.avatarColors.sand.background, fg: HOME_COLORS.avatarColors.sand.text },
  { bg: HOME_COLORS.avatarColors.lavender.background, fg: HOME_COLORS.avatarColors.lavender.text },
  { bg: HOME_COLORS.avatarColors.green.background, fg: HOME_COLORS.avatarColors.green.text },
  { bg: HOME_COLORS.avatarColors.rose.background, fg: HOME_COLORS.avatarColors.rose.text },
  { bg: HOME_COLORS.avatarColors.turquoise.background, fg: HOME_COLORS.avatarColors.turquoise.text },
];

const PATIENT_AVATAR_COLORS = [
  { bg: PATIENTS_COLORS.avatarColors.blue.background, fg: PATIENTS_COLORS.avatarColors.blue.text },
  { bg: PATIENTS_COLORS.avatarColors.sand.background, fg: PATIENTS_COLORS.avatarColors.sand.text },
  { bg: PATIENTS_COLORS.avatarColors.lavender.background, fg: PATIENTS_COLORS.avatarColors.lavender.text },
  { bg: PATIENTS_COLORS.avatarColors.green.background, fg: PATIENTS_COLORS.avatarColors.green.text },
  { bg: PATIENTS_COLORS.avatarColors.rose.background, fg: PATIENTS_COLORS.avatarColors.rose.text },
  { bg: PATIENTS_COLORS.avatarColors.turquoise.background, fg: PATIENTS_COLORS.avatarColors.turquoise.text },
];

// Siempre devuelve el mismo color para el mismo paciente (se calcula con su nombre)
const getAvatarColor = (
  p: MySqlPatientRecord,
  colors = HOME_AVATAR_COLORS
) => {
  const key = `${p.nombre ?? ''}${p.apellido_paterno ?? ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + (key.codePointAt(i) ?? 0)) >>> 0;
  }
  return colors[hash % colors.length];
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
  const fields = ['nombre', 'apellido_paterno', 'apellido_materno'] as const;
  for (const field of fields) {
    const valA = a[field] ?? '';
    const valB = b[field] ?? '';
    const result = valA.localeCompare(valB, 'es', {
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

// Normaliza texto para búsquedas: quita tildes/acentos y pasa a minúsculas ("Álvaro" -> "alvaro")
const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();


// Hook para cargar y gestionar los pacientes agendados para el día de hoy
const useTodayPatients = (
  userEmail: string | undefined,
  patients: MySqlPatientRecord[]
) => {
  const [todayPatients, setTodayPatients] = useState<MySqlPatientRecord[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchTodayPatients = async () => {
      try {
        const list = await patientService.getTodayPatients(userEmail);
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
      }
    };

    void fetchTodayPatients();

    return () => {
      isMounted = false;
    };
  }, [userEmail, patients]);

  return todayPatients;
};

// Banner visual cuando la suscripción se encuentra finalizada o inactiva
const SubscriptionBanner: React.FC<{ isPatientsTab: boolean }> = ({ isPatientsTab }) => (
  <View
    style={[
      styles.subscriptionBanner,
      {
        backgroundColor: isPatientsTab ? PATIENTS_COLORS.dangerSurface : HOME_COLORS.cancelledBadge,
        borderBottomColor: isPatientsTab ? PATIENTS_COLORS.borderDanger : HOME_COLORS.borderDanger,
      },
    ]}
  >
    <Ionicons
      name="alert-circle"
      size={24}
      color={isPatientsTab ? PATIENTS_COLORS.subscriptionErrorText : HOME_COLORS.iconError}
    />
    <View style={styles.subscriptionBannerTextWrapper}>
      <Text
        style={[
          styles.subscriptionBannerTitle,
          { color: isPatientsTab ? PATIENTS_COLORS.subscriptionErrorText : HOME_COLORS.textError },
        ]}
      >
        Suscripción Finalizada
      </Text>
      <Text
        style={[
          styles.subscriptionBannerMessage,
          { color: isPatientsTab ? PATIENTS_COLORS.subscriptionErrorSecondary : HOME_COLORS.textErrorSecondary },
        ]}
      >
        Comuníquese con el administrador para renovarla
      </Text>
    </View>
  </View>
);

interface PatientsHintProps {
  isEmpty: boolean;
}

// Mensaje centrado en el espacio libre de la tarjeta de Pacientes
const PatientsHint: React.FC<PatientsHintProps> = ({ isEmpty }) => (
  <View style={styles.patientsHint}>
    <View style={styles.patientsHintIcon}>
      <Ionicons name="people-outline" size={26} color={PATIENTS_COLORS.iconosPerfil} />
    </View>
    <Text style={styles.patientsHintTitle}>
      {isEmpty ? 'Tu lista está vacía por ahora' : 'Tu lista crece aquí'}
    </Text>
    <Text style={styles.patientsHintText}>
      Cada persona que registres desde Inicio aparecerá aquí, en orden alfabético.
    </Text>
  </View>
);

interface TodayAgendaRowProps {
  patient: MySqlPatientRecord;
  isLast: boolean;
  isSubscriptionActive: boolean;
  onPress: () => void;
}

// Fila individual de cita en la agenda del día
const TodayAgendaRow: React.FC<TodayAgendaRowProps> = ({
  patient,
  isLast,
  isSubscriptionActive,
  onPress,
}) => {
  const hora = patient.hora_cita;
  const avatar = getAvatarColor(patient);
  const isCancelled = patient.estado_cita === 'cancelada';
  const isSuplente = patient.rol_cita === 'suplente' || patient.tipo_relacion === 'suplente';
  const isEnSuplencia = patient.tipo_relacion === 'titular' && Boolean(patient.suplente_activo);

  return (
    <TouchableOpacity
      style={[
        styles.agendaRow,
        !isLast && styles.agendaRowSpacing,
        !isSubscriptionActive && styles.agendaRowDisabled,
      ]}
      onPress={onPress}
      activeOpacity={isSubscriptionActive ? 0.7 : 0.6}
    >
      <Text style={styles.agendaTime}>
        {hora ? hora.slice(0, 5) : 'Hoy'}
      </Text>

      <View style={[styles.agendaAvatar, { backgroundColor: avatar.bg }]}>
        <Text style={[styles.agendaAvatarText, { color: avatar.fg }]}>
          {getInitials(patient)}
        </Text>
      </View>

      <View style={styles.agendaInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text
            style={[
              styles.agendaName,
              isCancelled && styles.agendaNameCancelled,
            ]}
            numberOfLines={1}
          >
            {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno || ''}
          </Text>
          {isSuplente && (
            <View style={[styles.suplenteBadge, { backgroundColor: HOME_COLORS.substituteBadge, borderColor: HOME_COLORS.borderInfo }]}>
              <Text style={[styles.suplenteBadgeText, { color: HOME_COLORS.textInfo }]}>Suplencia</Text>
            </View>
          )}
          {isEnSuplencia && (
            <View style={[styles.enSuplenciaBadge, { backgroundColor: HOME_COLORS.coverBadge, borderColor: HOME_COLORS.borderWarning }]}>
              <Text style={[styles.enSuplenciaBadgeText, { color: HOME_COLORS.textWarning }]}>En suplencia</Text>
            </View>
          )}
          {isCancelled && (
            <View style={[styles.canceladaBadge, { backgroundColor: HOME_COLORS.cancelledBadge, borderColor: HOME_COLORS.borderDangerSoft }]}>
              <Text style={[styles.canceladaBadgeText, { color: HOME_COLORS.textDanger }]}>Cancelada</Text>
            </View>
          )}
        </View>
        <Text style={styles.agendaMeta} numberOfLines={1}>
          {patient.edad} años · {patient.genero}
          {isCancelled ? ' · Cita cancelada' : ''}
        </Text>
      </View>

      <Ionicons
        name={isSubscriptionActive ? 'chevron-forward' : 'lock-closed'}
        size={16}
        color={HOME_COLORS.textoSecundario}
      />
    </TouchableOpacity>
  );
};

interface PsychologistHomeTabProps {
  doctorName: string;
  isSubscriptionActive: boolean;
  todayPatients: MySqlPatientRecord[];
  onRegisterPatient: () => void;
  onSelectPatient: (patient: MySqlPatientRecord) => void;
  onOpenCalendar: () => void;
}

// Contenido de la pestaña Inicio (nombre del profesional, registro y agenda de hoy)
const PsychologistHomeTab: React.FC<PsychologistHomeTabProps> = ({
  doctorName,
  isSubscriptionActive,
  todayPatients,
  onRegisterPatient,
  onSelectPatient,
  onOpenCalendar,
}) => {
  return (
    <>
      {/* Nombre del profesional como texto libre, sin tarjeta ni saludo */}
      <Text style={styles.doctorName} numberOfLines={1}>
        {doctorName}
      </Text>

      {/* Sección de registro de pacientes */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[
            styles.registerPatientButton,
            !isSubscriptionActive && styles.registerButtonDisabled,
          ]}
          onPress={onRegisterPatient}
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
              color={isSubscriptionActive ? HOME_COLORS.iconosPerfil : HOME_COLORS.textoSecundario}
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
            color={isSubscriptionActive ? HOME_COLORS.iconosPerfil : HOME_COLORS.textoSecundario}
          />
        </TouchableOpacity>
      </View>

      {/* Sección de pacientes del día */}
      <View style={[styles.patientsSection, styles.agendaCard]}>
        <View style={styles.agendaHeader}>
          <Text style={styles.agendaTitle}>Agenda del día</Text>
          <TouchableOpacity
            onPress={onOpenCalendar}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.agendaLink}>Ver calendario</Text>
          </TouchableOpacity>
        </View>

        {todayPatients.length === 0 ? (
          <View style={styles.agendaEmpty}>
            <Ionicons name="calendar-outline" size={40} color={HOME_COLORS.textoSecundario} />
            <Text style={styles.emptyStateTitle}>Sin sesiones hoy</Text>
            <Text style={[styles.emptyStateText, { color: HOME_COLORS.textoSecundario }]}>
              No tienes consultas o citas programadas para el día de hoy.
            </Text>
          </View>
        ) : (
          todayPatients.map((patient, index) => (
            <TodayAgendaRow
              key={`today-${patient.id ?? patient.email}`}
              patient={patient}
              isLast={index === todayPatients.length - 1}
              isSubscriptionActive={isSubscriptionActive}
              onPress={() => onSelectPatient(patient)}
            />
          ))
        )}
      </View>
    </>
  );
};

// "Sesión hoy" tiene prioridad sobre "Nuevo" por ser lo más urgente
const getPatientHighlight = (hasSessionToday: boolean, fechaPrimeraSesion?: string | null) => {
  if (hasSessionToday) return 'Sesión hoy';
  if (isNewPatient(fechaPrimeraSesion)) return 'Nuevo';
  return null;
};

interface DirectoryPatientCardProps {
  patient: MySqlPatientRecord;
  letter: string;
  showLetter: boolean;
  hasSessionToday: boolean;
  isSubscriptionActive: boolean;
  onPress: () => void;
}

// Tarjeta individual en el directorio de pacientes
const DirectoryPatientCard: React.FC<DirectoryPatientCardProps> = ({
  patient,
  letter,
  showLetter,
  hasSessionToday,
  isSubscriptionActive,
  onPress,
}) => {
  const avatarColor = getAvatarColor(patient, PATIENT_AVATAR_COLORS);
  const highlight = getPatientHighlight(hasSessionToday, patient.fecha_primera_sesion);

  return (
    <React.Fragment key={`all-${patient.id ?? patient.email}`}>
      {showLetter && <Text style={styles.directoryLetter}>{letter}</Text>}

      <TouchableOpacity
        style={[
          styles.directoryCard,
          !isSubscriptionActive && styles.directoryCardDisabled,
        ]}
        onPress={onPress}
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
              <View style={[styles.suplenteBadge, { backgroundColor: PATIENTS_COLORS.substituteBadge, borderColor: PATIENTS_COLORS.borderInfo }]}>
                <Text style={[styles.suplenteBadgeText, { color: PATIENTS_COLORS.info }]}>Suplencia</Text>
              </View>
            )}
            {patient.tipo_relacion === 'titular' && Boolean(patient.suplente_activo) && (
              <View style={[styles.enSuplenciaBadge, { backgroundColor: PATIENTS_COLORS.coverBadge, borderColor: PATIENTS_COLORS.borderWarning }]}>
                <Text style={[styles.enSuplenciaBadgeText, { color: PATIENTS_COLORS.warning }]}>En suplencia</Text>
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
          color={HOME_COLORS.directoryTextSubtle}
        />
      </TouchableOpacity>
    </React.Fragment>
  );
};

interface PatientDirectorySectionProps {
  patients: MySqlPatientRecord[];
  todayEmails: Set<string | undefined>;
  searchTerm: string;
  onChangeSearchTerm: (term: string) => void;
  isSubscriptionActive: boolean;
  onSelectPatient: (patient: MySqlPatientRecord) => void;
  onShowSubscriptionAlert: () => void;
}

// Sección completa del Directorio de Pacientes (Buscador, lista agrupada y estado vacío)
const PatientDirectorySection: React.FC<PatientDirectorySectionProps> = ({
  patients,
  todayEmails,
  searchTerm,
  onChangeSearchTerm,
  isSubscriptionActive,
  onSelectPatient,
  onShowSubscriptionAlert,
}) => {
  const normalizedSearch = normalizeText(searchTerm.trim());
  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.nombre ?? ''} ${p.apellido_paterno ?? ''} ${p.apellido_materno ?? ''}`;
    return normalizeText(fullName).includes(normalizedSearch);
  });

  const sortedPatients = [...filteredPatients].sort(comparePatientsByName);
  const showLetterGroups = patients.length >= MIN_PATIENTS_FOR_LETTERS;
  const showFewPatientsHint = patients.length < FEW_PATIENTS_LIMIT && !searchTerm.trim();

  const renderContent = () => {
    if (patients.length === 0) {
      return <PatientsHint isEmpty />;
    }
    if (filteredPatients.length === 0) {
      return (
        <View style={styles.directoryEmpty}>
          <Ionicons name="search-outline" size={36} color={PATIENTS_COLORS.textSubtle} />
          <Text style={[styles.emptyStateTitle, { color: PATIENTS_COLORS.textBody }]}>
            Sin resultados para tu búsqueda
          </Text>
        </View>
      );
    }
    return (
      <>
        {sortedPatients.map((patient, index) => {
          const letter = getGroupLetter(patient);
          const showLetter =
            showLetterGroups &&
            (index === 0 || getGroupLetter(sortedPatients[index - 1]) !== letter);

          return (
            <DirectoryPatientCard
              key={`all-${patient.id ?? patient.email}`}
              patient={patient}
              letter={letter}
              showLetter={showLetter}
              hasSessionToday={todayEmails.has(patient.email)}
              isSubscriptionActive={isSubscriptionActive}
              onPress={() => onSelectPatient(patient)}
            />
          );
        })}
        {showFewPatientsHint && <PatientsHint isEmpty={false} />}
      </>
    );
  };

  return (
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
        <Ionicons name="search-outline" size={17} color={HOME_COLORS.directoryTextSubtle} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o apellido"
          placeholderTextColor={HOME_COLORS.directoryTextSubtle}
          value={searchTerm}
          onChangeText={onChangeSearchTerm}
          editable={isSubscriptionActive}
          onPressIn={() => {
            if (!isSubscriptionActive) onShowSubscriptionAlert();
          }}
        />
      </View>

      {renderContent()}
    </View>
  );
};

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
  const todayPatients = useTodayPatients(user?.email, patients);

  // Control unificado de suscripción:
  // Si la suscripción no está activa o ya venció, se bloquean todas las acciones clínicas
  // permitiendo exclusivamente navegar entre pestañas, leer el aviso y cerrar sesión.
  const isSubscriptionActive = user?.subscription?.isActive ?? true;

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
        onSelectPatientById={(patientId) => {
          const found = patients.find((p) => Number(p.id) === Number(patientId));
          if (found) {
            onSelectPatient(found);
          }
        }}
      />
    );
  }

  const todayEmails = new Set(todayPatients.map((p) => p.email));

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: activeTab === 'inicio' ? HOME_COLORS.fondoBase : PATIENTS_COLORS.canvasSubtle },
      ]}
    >
      {/* Banner de Suscripción Inactiva / Expirada */}
      {!isSubscriptionActive && <SubscriptionBanner isPatientsTab={activeTab === 'pacientes'} />}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          activeTab === 'pacientes' && styles.scrollContentPatients,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* PESTAÑA 1: INICIO */}
        {activeTab === 'inicio' && (
          <PsychologistHomeTab
            doctorName={doctorName}
            isSubscriptionActive={isSubscriptionActive}
            todayPatients={todayPatients}
            onRegisterPatient={handleRegisterPatientPress}
            onSelectPatient={handlePatientPress}
            onOpenCalendar={() => setActiveTab('calendario')}
          />
        )}

        {/* PESTAÑA 2: PACIENTES */}
        {activeTab === 'pacientes' && (
          <PatientDirectorySection
            patients={patients}
            todayEmails={todayEmails}
            searchTerm={searchTerm}
            onChangeSearchTerm={setSearchTerm}
            isSubscriptionActive={isSubscriptionActive}
            onSelectPatient={handlePatientPress}
            onShowSubscriptionAlert={showSubscriptionAlert}
          />
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



const softShadow = {
  shadowColor: HOME_COLORS.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 1,
};

const patientsShadow = {
  shadowColor: PATIENTS_COLORS.shadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 1,
};




// ESTILOS PESTAÑA PRINCIPAL

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },

  //PESTAÑA MIS PACIENTES
  searchBox: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PATIENTS_COLORS.directorySearch,
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.borderGreenSoft,
    borderRadius: 10,
    paddingHorizontal: 20,
    marginBottom: 18,
    marginVertical: 10,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: PATIENTS_COLORS.textoPrincipal,
  },

  doctorName: {
    fontSize: 22,
    fontWeight: '700',
    color: HOME_COLORS.textoPrincipal,
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 10,
  },

  /* =========================
     SCROLL
  ========================= */

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    backgroundColor: HOME_COLORS.surfaceGreenSoft,
    borderWidth: 1,
    borderColor: HOME_COLORS.bordeIconos,
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
    backgroundColor: HOME_COLORS.fondoiconos,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  buttonIconWrapperDisabled: {
    backgroundColor: HOME_COLORS.fondoiconos,
  },

  registerButtonTitle: {
    flex: 1,
    color: HOME_COLORS.iconosPerfil,
    fontSize: 15,
    fontWeight: '600',
  },

  registerButtonTitleDisabled: {
    color: HOME_COLORS.textoSecundario,
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
    backgroundColor: HOME_COLORS.fondoBase,
    borderWidth: 1,
    borderColor: HOME_COLORS.bordeIconos,
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
    color: HOME_COLORS.textoPrincipal,
  },

  agendaLink: {
    fontSize: 13,
    fontWeight: '600',
    color: HOME_COLORS.iconosPerfil,
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
    backgroundColor: HOME_COLORS.surfaceGreenSoft,
    borderWidth: 1,
    borderColor: HOME_COLORS.bordeIconos,
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
    color: HOME_COLORS.iconosPerfil,
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
    color: HOME_COLORS.iconosPerfil,
  },

  agendaInfo: {
    flex: 1,
    marginRight: 8,
  },

  agendaName: {
    fontSize: 15,
    fontWeight: '600',
    color: HOME_COLORS.textoPrincipal,
  },

  agendaMeta: {
    fontSize: 13,
    color: HOME_COLORS.textoSecundario,
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
    color: PATIENTS_COLORS.textoPrincipal,
  },

  directoryCount: {
    fontSize: 12.5,
    color: PATIENTS_COLORS.textGreenSubtle,
  },

  // Tarjeta grande: título, buscador y lista
  directoryPanel: {
    ...patientsShadow,
    flex: 1, // ocupa todo el alto disponible aunque haya pocos pacientes
    backgroundColor: PATIENTS_COLORS.surface,
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.borderGreenSoft,
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
    backgroundColor: PATIENTS_COLORS.fondoiconos,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  patientsHintTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: PATIENTS_COLORS.iconosPerfil,
    textAlign: 'center',
  },

  patientsHintText: {
    marginTop: 4,
    fontSize: 13,
    color: PATIENTS_COLORS.textoSecundario,
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
    color: PATIENTS_COLORS.textSubtle,
  },

  // Cada paciente, en gris verdoso claro
  directoryCard: {
    backgroundColor: PATIENTS_COLORS.directoryListItem,
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.directoryBorder,
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
    color: PATIENTS_COLORS.textoPrincipal,
  },

  directoryMeta: {
    fontSize: 13,
    color: PATIENTS_COLORS.textGreenSubtle,
    marginTop: 2,
  },

  directoryHighlight: {
    color: PATIENTS_COLORS.directoryHighlight,
    fontWeight: '700',
  },

  /* =========================
     ESTADO VACÍO
  ========================= */

  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },

  emptyStateText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  /* =========================
     BANNER DE SUSCRIPCIÓN
  ========================= */

  subscriptionBanner: {
    borderBottomWidth: 1.5,
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
  },

  subscriptionBannerMessage: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 16,
    fontWeight: '600',
  },

  registerButtonDisabled: {
    backgroundColor: HOME_COLORS.fondoiconos,
    borderColor: HOME_COLORS.bordeIconos,
  },

  suplenteBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  suplenteBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  enSuplenciaBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  enSuplenciaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  canceladaBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  canceladaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  agendaNameCancelled: {
    color: HOME_COLORS.textoSecundario,
    textDecorationLine: 'line-through',
  },
});