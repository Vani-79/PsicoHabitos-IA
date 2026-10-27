import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MySqlPatientRecord, AppointmentSession } from '../../types/patient';
import { DatePickerModal } from '../../components/DatePickerModal';
import { TimePickerModal } from '../../components/TimePickerModal';
import { appointmentService } from '../../services/appointmentService';
import { useAuth } from '../../context/AuthContext';
import { formatToChileanDate } from '../../utils/date';
import { useNavigation } from '@react-navigation/native';
import { PsychologistNavigationProp, HabitReportFilters } from '../../navigation/types';
import { HabitFilterModal } from '../../components/HabitFilterModal';
import { PSYCHOLOGIST_COLORS } from './psychologistColors';

const PATIENTS_COLORS = PSYCHOLOGIST_COLORS.pacientes;
const PROFILE_COLORS = PSYCHOLOGIST_COLORS.perfil;

type Duracion = '30' | '45' | '60' | '75' | '90';
type Modalidad = 'presencial' | 'online';

export interface PatientDetailScreenProps {
  patient: MySqlPatientRecord;
  onBack: () => void;
  onPatientUpdated?: () => void;
}

const DURATIONS: { key: Duracion; label: string }[] = [
  { key: '30', label: '30 min' },
  { key: '45', label: '45 min' },
  { key: '60', label: '60 min' },
  { key: '75', label: '75 min' },
  { key: '90', label: '90 min' },
];

const SESSIONS_PER_PAGE = 3;

// ── Helpers de fecha/hora y validaciones ─────────────────────────────────

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateForInitialPicker = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** true si la hora sigue siendo válida para la fecha dada
 *  (si la fecha es hoy, exige al menos 30 min de anticipación). */
const isTimeStillValid = (dateStr: string, timeStr: string): boolean => {
  if (!dateStr || !timeStr) return true;
  if (dateStr !== getTodayStr()) return true;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(timeStr) > nowMinutes + 30;
};

/** true si [startA, startA+durA) se cruza con [startB, startB+durB) */
const rangesOverlap = (startA: number, durA: number, startB: number, durB: number): boolean => {
  const endA = startA + durA;
  const endB = startB + durB;
  return startA < endB && startB < endA;
};

const parseDateParts = (
  dateValue: string | Date | undefined
): { y: number; m: number; d: number } | null => {
  if (!dateValue) return null;
  const cleanDateStr = String(dateValue).split('T')[0];
  const parts = cleanDateStr.split('-');
  if (parts.length !== 3) return null;
  return { y: Number(parts[0]), m: Number(parts[1]) - 1, d: Number(parts[2]) };
};

const getMinBookingDate = (patient: MySqlPatientRecord): Date => {
  if (patient.tipo_relacion !== 'titular' || !patient.suplente_activo?.fecha_fin_suplencia) {
    return new Date();
  }
  const parts = parseDateParts(patient.suplente_activo.fecha_fin_suplencia);
  if (!parts) return new Date();

  const dayAfterSuplencia = new Date(parts.y, parts.m, parts.d + 1, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dayAfterSuplencia > today ? dayAfterSuplencia : new Date();
};

const getMaxBookingDate = (patient: MySqlPatientRecord): Date => {
  if (patient.tipo_relacion === 'suplente' && patient.fecha_fin_suplencia) {
    const parts = parseDateParts(patient.fecha_fin_suplencia);
    if (parts) {
      return new Date(parts.y, parts.m, parts.d, 23, 59, 59);
    }
  }
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d;
};

const checkSuplenciaRestrictions = (
  patient: MySqlPatientRecord,
  dateStr: string,
  isEdit = false
): string | null => {
  if (patient.tipo_relacion === 'titular' && patient.suplente_activo?.fecha_fin_suplencia) {
    const suplenteEndStr = String(patient.suplente_activo.fecha_fin_suplencia).split('T')[0];
    if (dateStr <= suplenteEndStr) {
      return isEdit
        ? `No puedes reprogramar la cita para una fecha cubierta por la suplencia activa de ${
            patient.suplente_activo.nombre || 'el suplente'
          } (hasta el ${formatToChileanDate(suplenteEndStr)}).`
        : `Este paciente se encuentra bajo cobertura del psicólogo suplente (${
            patient.suplente_activo.nombre
          }) hasta el ${formatToChileanDate(
            suplenteEndStr
          )}.\n\nSolo puedes agendar citas a partir del día siguiente a esa fecha o finalizando la suplencia.`;
    }
  }

  if (patient.tipo_relacion === 'suplente' && patient.fecha_fin_suplencia) {
    const suplenteEndStr = String(patient.fecha_fin_suplencia).split('T')[0];
    if (dateStr > suplenteEndStr) {
      return isEdit
        ? `Tu periodo de suplencia finaliza el ${formatToChileanDate(
            suplenteEndStr
          )}. No puedes reprogramar citas posteriores a esa fecha.`
        : `Tu periodo de suplencia finaliza el ${formatToChileanDate(
            suplenteEndStr
          )}. No puedes programar citas posteriores a esa fecha.`;
    }
  }

  return null;
};

const hasScheduleConflict = (
  hora: string,
  duracion: number,
  busySessions: { hora: string; duracion: number }[]
): boolean => {
  const startMinutes = timeToMinutes(hora);
  return busySessions.some((b) =>
    rangesOverlap(startMinutes, duracion, timeToMinutes(b.hora), b.duracion)
  );
};

const getDoctorRoleSuffix = (session: AppointmentSession): string => {
  if (session.tipoEspecialista === 'suplente') return ' (Suplente)';
  if (session.tipoEspecialista === 'titular_anterior') return ' (Titular Anterior)';
  if (session.esPropia === false) return ' (Colega)';
  return '';
};

const getStatusLabel = (isCancelada: boolean, isCompletada: boolean): string => {
  if (isCancelada) return 'Cancelada';
  if (isCompletada) return 'Completada';
  return 'Programada';
};

// ── Subcomponentes Visuales ───────────────────────────────────────────────

const PatientRoleBanners: React.FC<{ patient: MySqlPatientRecord }> = ({ patient }) => {
  return (
    <>
      {patient.tipo_relacion === 'suplente' && (
        <View style={styles.suplenteBanner}>
          <View style={styles.suplenteBannerHeader}>
            <Ionicons name="shield-checkmark" size={18} color={PATIENTS_COLORS.textInfoStrong} />
            <Text style={styles.suplenteBannerTitle}>Atendiendo como Psicólogo Suplente</Text>
          </View>
          <Text style={styles.suplenteBannerText}>
            Tienes cobertura temporal de atención autorizada por el paciente hasta el{' '}
            <Text style={{ fontWeight: '700' }}>
              {patient.fecha_fin_suplencia
                ? formatToChileanDate(patient.fecha_fin_suplencia)
                : 'fecha límite'}
            </Text>
            . Puedes acceder a su historial clínico completo y registrar nuevas sesiones.
          </Text>
        </View>
      )}

      {patient.tipo_relacion === 'titular' && patient.suplente_activo && (
        <View style={styles.titularSuplenciaBanner}>
          <View style={styles.suplenteBannerHeader}>
            <Ionicons name="information-circle" size={18} color={PATIENTS_COLORS.textWarningStrong} />
            <Text style={styles.titularBannerTitle}>Cobertura de Suplencia Activa</Text>
          </View>
          <Text style={styles.titularBannerText}>
            El especialista{' '}
            <Text style={{ fontWeight: '700' }}>{patient.suplente_activo.nombre}</Text> tiene
            cobertura temporal activa sobre este paciente
            {patient.suplente_activo.fecha_fin_suplencia
              ? ` hasta el ${formatToChileanDate(patient.suplente_activo.fecha_fin_suplencia)}`
              : ''}
            .
          </Text>
          <Text
            style={[
              styles.titularBannerText,
              { marginTop: 4, fontStyle: 'italic', color: PATIENTS_COLORS.textWarningDark },
            ]}
          >
            Nota: La revocación o término anticipado de la suplencia es una decisión exclusiva del
            paciente desde su perfil.
          </Text>
        </View>
      )}
    </>
  );
};

const PatientInfoCard: React.FC<{ patient: MySqlPatientRecord }> = ({ patient }) => (
  <View style={styles.infoCard}>
    <Text style={styles.infoLabel}>
      Nombre: <Text style={styles.infoValue}>{patient.nombre} {patient.apellido_paterno} {patient.apellido_materno}</Text>
    </Text>
    <Text style={styles.infoLabel}>
      Edad: <Text style={styles.infoValue}>{patient.edad} años</Text>
    </Text>
    <Text style={styles.infoLabel}>
      Correo electrónico: <Text style={styles.infoValue}>{patient.email}</Text>
    </Text>
    <Text style={styles.infoLabel}>
      Fecha primera sesión: <Text style={styles.infoValue}>{formatToChileanDate(patient.fecha_primera_sesion) || 'No registrada'}</Text>
    </Text>
  </View>
);

interface SessionItemCardProps {
  session: AppointmentSession;
  onEdit: (session: AppointmentSession) => void;
}

const SessionItemCard: React.FC<SessionItemCardProps> = ({ session, onEdit }) => {
  const isCancelada = session.estado?.toLowerCase() === 'cancelada';
  const isCompletada = session.estado?.toLowerCase() === 'completada';
  const isProgramada = !isCancelada && !isCompletada;
  const doctorSuffix = getDoctorRoleSuffix(session);
  const statusLabel = getStatusLabel(isCancelada, isCompletada);

  return (
    <View style={[styles.sessionCard, isCancelada && styles.sessionCardCancelled]}>
      {/* Fila superior: Fecha, Hora y Modalidad (con flex: 1 para salto de línea seguro) + Estado a la derecha */}
      <View style={styles.sessionCardHeaderRow}>
        <Text style={[styles.sessionDate, isCancelada && styles.sessionDateCancelled]}>
          {formatToChileanDate(session.fecha)} · {session.hora}{' '}
          {session.horaFin ? `- ${session.horaFin}` : ''} ·{' '}
          {session.modalidad === 'presencial' ? 'Presencial' : 'Online'}
        </Text>

        <View style={styles.sessionCardRightCol}>
          <View
            style={[
              styles.statusBadge,
              isCompletada && styles.statusBadgeCompleted,
              isCancelada && styles.statusBadgeCancelled,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isCompletada && styles.statusBadgeTextCompleted,
                isCancelada && styles.statusBadgeTextCancelled,
              ]}
            >
              {statusLabel}
            </Text>
          </View>

          {isProgramada && (
            session.esPropia !== false ? (
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => onEdit(session)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="create-outline"
                  size={13}
                  color={PATIENTS_COLORS.iconosPerfil}
                  style={{ marginRight: 3 }}
                />
                <Text style={styles.manageButtonText}>Modificar</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.readOnlyBadge}>
                <Ionicons
                  name="lock-closed"
                  size={11}
                  color={PATIENTS_COLORS.textoSecundario}
                  style={{ marginRight: 3 }}
                />
                <Text style={styles.readOnlyBadgeText}>Solo lectura</Text>
              </View>
            )
          )}
        </View>
      </View>

      {/* Fila del especialista: Ancho completo sin colisiones */}
      {session.doctorNombre && (
        <View style={styles.doctorBadgeRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={12}
            color={PATIENTS_COLORS.textoSecundario}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.doctorBadgeText}>
            {session.doctorNombre}
            {doctorSuffix}
          </Text>
        </View>
      )}

      {/* Observaciones: Ancho completo */}
      {session.observaciones ? (
        <Text style={[styles.sessionMotivo, isCancelada && styles.sessionMotivoCancelled]}>
          {session.observaciones}
        </Text>
      ) : (
        <Text style={[styles.sessionMotivo, { fontStyle: 'italic', color: PATIENTS_COLORS.textoSecundario }]}>
          Sin observaciones registradas
        </Text>
      )}
    </View>
  );
};

interface SessionPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const SessionPagination: React.FC<SessionPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.paginationRow}>
      <TouchableOpacity
        style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
        onPress={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chevron-back"
          size={18}
          color={currentPage === 0 ? PATIENTS_COLORS.bordeIconos : PATIENTS_COLORS.iconosPerfil}
        />
        <Text style={[styles.pageButtonText, currentPage === 0 && styles.pageButtonTextDisabled]}>
          Anterior
        </Text>
      </TouchableOpacity>

      <Text style={styles.pageIndicator}>
        {currentPage + 1} / {totalPages}
      </Text>

      <TouchableOpacity
        style={[
          styles.pageButton,
          currentPage >= totalPages - 1 && styles.pageButtonDisabled,
        ]}
        onPress={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage >= totalPages - 1}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pageButtonText,
            currentPage >= totalPages - 1 && styles.pageButtonTextDisabled,
          ]}
        >
          Siguiente
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={currentPage >= totalPages - 1 ? PATIENTS_COLORS.bordeIconos : PATIENTS_COLORS.iconosPerfil}
        />
      </TouchableOpacity>
    </View>
  );
};

interface SessionsHistorySectionProps {
  loading: boolean;
  sessions: AppointmentSession[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEditSession: (session: AppointmentSession) => void;
}

const SessionsHistorySection: React.FC<SessionsHistorySectionProps> = ({
  loading,
  sessions,
  currentPage,
  totalPages,
  onPageChange,
  onEditSession,
}) => {
  const paginatedSessions = sessions.slice(
    currentPage * SESSIONS_PER_PAGE,
    currentPage * SESSIONS_PER_PAGE + SESSIONS_PER_PAGE
  );

  const renderHistoryContent = () => {
    if (loading) {
      return (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={PATIENTS_COLORS.iconosPerfil} />
          <Text style={{ marginTop: 8, color: PATIENTS_COLORS.textoSecundario, fontSize: 13 }}>
            Cargando sesiones...
          </Text>
        </View>
      );
    }

    if (sessions.length === 0) {
      return (
        <View style={styles.emptyHistoryCard}>
          <Ionicons name="calendar-outline" size={36} color={PATIENTS_COLORS.textoSecundario} />
          <Text style={styles.emptyHistoryText}>
            Aún no hay sesiones agendadas para este paciente.
          </Text>
        </View>
      );
    }

    return (
      <>
        {paginatedSessions.map((session) => (
          <SessionItemCard key={session.id} session={session} onEdit={onEditSession} />
        ))}
        <SessionPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </>
    );
  };

  return (
    <>
      <Text style={styles.historyTitle}>Historial de sesiones</Text>
      {renderHistoryContent()}
    </>
  );
};

// ── Modales ───────────────────────────────────────────────────────────────

interface ScheduleSessionModalProps {
  visible: boolean;
  patient: MySqlPatientRecord;
  minBookingDate: Date;
  maxBookingDate: Date;
  onClose: () => void;
  onSessionCreated: () => void;
}

const ScheduleSessionModal: React.FC<ScheduleSessionModalProps> = ({
  visible,
  patient,
  minBookingDate,
  maxBookingDate,
  onClose,
  onSessionCreated,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [duracion, setDuracion] = useState<Duracion | ''>('');
  const [modalidad, setModalidad] = useState<Modalidad | ''>('');
  const [observaciones, setObservaciones] = useState('');
  const [busySessions, setBusySessions] = useState<{ hora: string; duracion: number }[]>([]);

  const resetForm = () => {
    setFecha('');
    setHora('');
    setDuracion('');
    setModalidad('');
    setObservaciones('');
    setBusySessions([]);
  };

  const loadBusySessionsForDate = async (dateStr: string) => {
    if (!dateStr) {
      setBusySessions([]);
      return;
    }
    try {
      const dayAppointments = await appointmentService.getPsychologistCalendar({ date: dateStr });
      const busyForDay = dayAppointments
        .filter((a) => a.estado !== 'Cancelada')
        .map((a) => ({ hora: a.hora, duracion: Number(a.duracion) || 60 }));
      setBusySessions(busyForDay);
    } catch (err) {
      console.warn('[PatientDetailScreen] Error al cargar horarios ocupados:', err);
      setBusySessions([]);
    }
  };

  useEffect(() => {
    if (fecha && hora && !isTimeStillValid(fecha, hora)) {
      setHora('');
      Alert.alert(
        'Hora ya no disponible',
        'La hora que habías elegido ya pasó para la fecha seleccionada. Por favor, elige una nueva hora.'
      );
    }
    void loadBusySessionsForDate(fecha);
  }, [fecha]);

  useEffect(() => {
    if (!fecha || !hora || !duracion) return;
    const conflict = hasScheduleConflict(hora, Number(duracion) || 60, busySessions);
    if (conflict) {
      setHora('');
      Alert.alert(
        'Hora no disponible',
        'La hora que habías seleccionado se cruza con otra sesión para la duración elegida. Por favor, selecciona una nueva hora.'
      );
    }
  }, [duracion, busySessions]);

  const handleOpenTimePicker = () => {
    if (!fecha) {
      Alert.alert(
        'Selecciona primero la fecha',
        'Elige la fecha de la sesión antes de escoger la hora.'
      );
      return;
    }
    setShowTimePicker(true);
  };

  const hasUnsavedChanges = () =>
    Boolean(fecha || hora || duracion || modalidad || observaciones.trim());

  const handleCloseModal = () => {
    if (!hasUnsavedChanges()) {
      onClose();
      return;
    }
    Alert.alert(
      '¿Descartar cambios?',
      'Tienes datos sin guardar. Si sales ahora, se perderán.',
      [
        { text: 'Seguir editando', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            resetForm();
            onClose();
          },
        },
      ]
    );
  };

  const handleSaveSession = async () => {
    if (!fecha) {
      Alert.alert('Falta la fecha', 'Selecciona la fecha de la sesión.');
      return;
    }
    if (!hora) {
      Alert.alert('Falta la hora', 'Selecciona la hora de la sesión.');
      return;
    }
    if (!duracion) {
      Alert.alert('Falta la duración', 'Selecciona la duración de la sesión.');
      return;
    }
    if (!modalidad) {
      Alert.alert('Falta la modalidad', 'Selecciona si la sesión será presencial u online.');
      return;
    }
    if (!isTimeStillValid(fecha, hora)) {
      Alert.alert(
        'Hora inválida',
        'La hora seleccionada ya pasó. Por favor, elige una hora futura.'
      );
      setHora('');
      return;
    }
    if (!patient.id) {
      Alert.alert('Error', 'No se encontró el ID del paciente.');
      return;
    }

    const suplenciaError = checkSuplenciaRestrictions(patient, fecha, false);
    if (suplenciaError) {
      Alert.alert(
        patient.tipo_relacion === 'titular'
          ? 'Día reservado para suplencia'
          : 'Fecha excede suplencia',
        suplenciaError
      );
      return;
    }

    const newDuration = Number(duracion);
    const conflict = hasScheduleConflict(hora, newDuration, busySessions);
    if (conflict) {
      Alert.alert(
        'Horario ocupado',
        'Ya existe una sesión que se cruza con este horario y duración. Elige otra hora.'
      );
      setHora('');
      return;
    }

    setIsSaving(true);
    const res = await appointmentService.createAppointment({
      paciente_id: patient.id,
      fecha,
      hora,
      duracion: newDuration,
      modalidad,
      observaciones: observaciones.trim(),
    });
    setIsSaving(false);

    if (res.success) {
      Alert.alert('¡Sesión agendada!', 'La sesión se ha programado exitosamente.');
      resetForm();
      onClose();
      onSessionCreated();
    } else {
      Alert.alert('Error al agendar', res.error || 'No se pudo guardar la sesión.');
    }
  };

  return (
    <>
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={handleCloseModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Agendar nueva sesión</Text>

              {patient.tipo_relacion === 'titular' && patient.suplente_activo && (
                <View style={styles.substitutionScheduleNotice}>
                  <Ionicons
                    name="information-circle"
                    size={17}
                    color={PATIENTS_COLORS.textWarningStrong}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.substitutionScheduleNoticeText}>
                    Paciente en suplencia activa hasta el{' '}
                    <Text style={{ fontWeight: '700' }}>
                      {formatToChileanDate(patient.suplente_activo.fecha_fin_suplencia)}
                    </Text>
                    . Los días cubiertos están bloqueados; puedes agendar a partir del día siguiente.
                  </Text>
                </View>
              )}

              {/* Fecha */}
              <Text style={styles.fieldLabel}>Fecha</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={18} color={PATIENTS_COLORS.iconosPerfil} style={styles.pickerIcon} />
                <Text style={[styles.pickerValueText, !fecha && styles.pickerPlaceholder]}>
                  {fecha ? formatToChileanDate(fecha) : 'Seleccionar fecha'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={PATIENTS_COLORS.textoSecundario} />
              </TouchableOpacity>

              {/* Hora */}
              <Text style={styles.fieldLabel}>Hora</Text>
              <TouchableOpacity
                style={[styles.pickerTrigger, !fecha && styles.pickerTriggerDisabled]}
                onPress={handleOpenTimePicker}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="time"
                  size={18}
                  color={fecha ? PATIENTS_COLORS.iconosPerfil : PATIENTS_COLORS.textoSecundario}
                  style={styles.pickerIcon}
                />
                <Text style={[styles.pickerValueText, !hora && styles.pickerPlaceholder]}>
                  {hora || (fecha ? 'Seleccionar hora' : 'Primero elige la fecha')}
                </Text>
                <Ionicons name="chevron-down" size={16} color={PATIENTS_COLORS.textoSecundario} />
              </TouchableOpacity>

              {/* Duración */}
              <Text style={styles.fieldLabel}>Duración</Text>
              <View style={styles.chipRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.chip, duracion === d.key && styles.chipActive]}
                    onPress={() => setDuracion(d.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, duracion === d.key && styles.chipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Modalidad */}
              <Text style={styles.fieldLabel}>Modalidad</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, modalidad === 'presencial' && styles.chipActive]}
                  onPress={() => setModalidad('presencial')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      modalidad === 'presencial' && styles.chipTextActive,
                    ]}
                  >
                    Presencial
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, modalidad === 'online' && styles.chipActive]}
                  onPress={() => setModalidad('online')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      modalidad === 'online' && styles.chipTextActive,
                    ]}
                  >
                    Online
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Observaciones */}
              <Text style={styles.fieldLabel}>Observaciones</Text>
              <TextInput
                style={[
                  styles.input,
                  { minHeight: 64, textAlignVertical: 'top', paddingTop: 10 },
                ]}
                placeholder="Ej. Seguimiento de ansiedad, evaluación inicial, acuerdos previos..."
                placeholderTextColor={PATIENTS_COLORS.textoSecundario}
                value={observaciones}
                onChangeText={setObservaciones}
                multiline
              />

              <TouchableOpacity
                style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                onPress={handleSaveSession}
                activeOpacity={0.85}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={PATIENTS_COLORS.textoBlanco} />
                ) : (
                  <Text style={styles.saveButtonText}>Agendar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCloseModal} style={{ marginTop: 8 }}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        title="Fecha de la Sesión"
        initialDate={fecha || formatDateForInitialPicker(minBookingDate)}
        minDate={minBookingDate}
        maxDate={maxBookingDate}
        yearOrder="asc"
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(formattedDate: string) => setFecha(formattedDate)}
      />

      <TimePickerModal
        visible={showTimePicker}
        selectedTime={hora || '10:00'}
        selectedDate={fecha}
        busySessions={busySessions}
        duration={Number(duracion) || 60}
        title="Selecciona la hora de la sesión"
        onClose={() => setShowTimePicker(false)}
        onSelectTime={(selected) => setHora(selected)}
      />
    </>
  );
};

interface EditSessionModalProps {
  visible: boolean;
  session: AppointmentSession | null;
  patient: MySqlPatientRecord;
  minBookingDate: Date;
  maxBookingDate: Date;
  onClose: () => void;
  onSessionUpdated: () => void;
}

const EditSessionModal: React.FC<EditSessionModalProps> = ({
  visible,
  session,
  patient,
  minBookingDate,
  maxBookingDate,
  onClose,
  onSessionUpdated,
}) => {
  const [editFecha, setEditFecha] = useState('');
  const [editHora, setEditHora] = useState('');
  const [editModalidad, setEditModalidad] = useState<Modalidad>('presencial');
  const [editDuracion, setEditDuracion] = useState<Duracion>('60');
  const [editObservaciones, setEditObservaciones] = useState('');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busySessionsForEdit, setBusySessionsForEdit] = useState<
    { hora: string; duracion: number }[]
  >([]);

  const loadBusySessionsForEditDate = async (dateStr: string, currentSessionId?: string) => {
    if (!dateStr) {
      setBusySessionsForEdit([]);
      return;
    }
    try {
      const dayAppointments = await appointmentService.getPsychologistCalendar({ date: dateStr });
      const busyForDay = dayAppointments
        .filter((a) => a.estado !== 'Cancelada' && String(a.id) !== String(currentSessionId))
        .map((a) => ({ hora: a.hora, duracion: Number(a.duracion) || 60 }));
      setBusySessionsForEdit(busyForDay);
    } catch (err) {
      console.warn('[PatientDetailScreen] Error al cargar horarios ocupados para edición:', err);
      setBusySessionsForEdit([]);
    }
  };

  useEffect(() => {
    if (session && visible) {
      setEditFecha(session.fecha);
      setEditHora(session.hora);
      setEditModalidad(session.modalidad === 'online' ? 'online' : 'presencial');
      const rawDur = String(session.duracion || '60');
      setEditDuracion(
        ['30', '45', '60', '75', '90'].includes(rawDur) ? (rawDur as Duracion) : '60'
      );
      setEditObservaciones(session.observaciones || '');
      void loadBusySessionsForEditDate(session.fecha, session.id);
    }
  }, [session, visible]);

  useEffect(() => {
    if (visible && editFecha && session) {
      void loadBusySessionsForEditDate(editFecha, session.id);
      if (editHora && !isTimeStillValid(editFecha, editHora)) {
        setEditHora('');
        Alert.alert('Hora ya no disponible', 'La hora seleccionada ya pasó para la fecha elegida.');
      }
    }
  }, [editFecha]);

  useEffect(() => {
    if (!editFecha || !editHora || !editDuracion) return;
    const hasConflict = hasScheduleConflict(
      editHora,
      Number(editDuracion) || 60,
      busySessionsForEdit
    );
    if (hasConflict) {
      setEditHora('');
      Alert.alert(
        'Hora no disponible',
        'La hora seleccionada se cruza con otra sesión para la duración elegida. Por favor, selecciona una nueva hora.'
      );
    }
  }, [editDuracion, busySessionsForEdit]);

  const hasEditChanges = () => {
    if (!session) return false;
    return (
      editFecha !== session.fecha ||
      editHora !== session.hora ||
      editModalidad !== (session.modalidad === 'online' ? 'online' : 'presencial') ||
      editDuracion !== String(session.duracion || '60') ||
      editObservaciones.trim() !== (session.observaciones || '').trim()
    );
  };

  const handleClose = () => {
    if (!hasEditChanges()) {
      onClose();
      return;
    }
    Alert.alert(
      '¿Descartar modificaciones?',
      'Tienes cambios sin guardar en esta cita. Si sales ahora, se perderán las modificaciones.',
      [
        { text: 'Seguir editando', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: onClose,
        },
      ]
    );
  };

  const handleSaveEditSession = () => {
    if (!session) return;
    if (!editFecha) {
      Alert.alert('Falta la fecha', 'Selecciona la fecha para la sesión.');
      return;
    }
    if (!editHora) {
      Alert.alert('Falta la hora', 'Selecciona la hora para la sesión.');
      return;
    }
    if (!isTimeStillValid(editFecha, editHora)) {
      Alert.alert('Hora inválida', 'La hora seleccionada ya pasó. Elige una hora futura.');
      return;
    }

    const suplenciaError = checkSuplenciaRestrictions(patient, editFecha, true);
    if (suplenciaError) {
      Alert.alert(
        patient.tipo_relacion === 'titular'
          ? 'Día reservado para suplencia'
          : 'Fecha excede suplencia',
        suplenciaError
      );
      return;
    }

    const durMin = Number(editDuracion) || 60;
    const hasConflict = hasScheduleConflict(editHora, durMin, busySessionsForEdit);
    if (hasConflict) {
      Alert.alert(
        'Horario ocupado',
        'Ya existe otra sesión que se cruza con este horario y duración. Por favor, selecciona otra hora.'
      );
      return;
    }

    Alert.alert(
      'Confirmar modificaciones',
      `¿Deseas guardar los cambios en esta cita?\n\n• Fecha: ${editFecha}\n• Hora: ${editHora} hrs\n• Duración: ${editDuracion} min\n• Modalidad: ${
        editModalidad === 'online' ? 'Online' : 'Presencial'
      }`,
      [
        { text: 'Volver a revisar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsUpdating(true);
            const res = await appointmentService.updateAppointment(session.id, {
              fecha: editFecha,
              hora: editHora,
              duracion: durMin,
              modalidad: editModalidad,
              observaciones: editObservaciones.trim(),
            });
            setIsUpdating(false);

            if (res.success) {
              Alert.alert('¡Cita modificada!', 'La sesión ha sido reprogramada exitosamente.');
              onClose();
              onSessionUpdated();
            } else {
              Alert.alert('Error', res.error || 'No se pudo actualizar la cita.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteSession = () => {
    if (!session) return;
    Alert.alert(
      '¿Cancelar cita programada?',
      `¿Estás seguro de que deseas cancelar la cita del ${formatToChileanDate(
        session.fecha
      )} a las ${session.hora} hrs? Esta acción liberará el horario de tu agenda.`,
      [
        { text: 'No, mantener cita', style: 'cancel' },
        {
          text: 'Sí, cancelar cita',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const res = await appointmentService.deleteAppointment(session.id);
            setIsDeleting(false);

            if (res.success) {
              Alert.alert('Cita cancelada', 'La cita programada ha sido eliminada con éxito.');
              onClose();
              onSessionUpdated();
            } else {
              Alert.alert('Error', res.error || 'No se pudo cancelar la cita.');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Modal
        animationType="fade"
        transparent
        visible={visible && Boolean(session)}
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeaderTitle}>Modificar Cita paciente</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                 
                </TouchableOpacity>
              </View>

              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Nombre: {' '}
                  <Text style={{ fontWeight: '500' }}>
                    {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno}
                  </Text>
                </Text>
              </View>

              {/* Fecha */}
              <Text style={styles.fieldLabel}>Fecha de la sesión</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowEditDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={PATIENTS_COLORS.iconosPerfil}
                  style={styles.pickerIcon}
                />
                <Text style={styles.pickerValueText}>{formatToChileanDate(editFecha)}</Text>
                <Ionicons name="chevron-down" size={16} color={PATIENTS_COLORS.iconosPerfil} />
              </TouchableOpacity>

              {/* Hora */}
              <Text style={styles.fieldLabel}>Hora</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowEditTimePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={PATIENTS_COLORS.iconosPerfil}
                  style={styles.pickerIcon}
                />
                <Text style={styles.pickerValueText}>{editHora} hrs</Text>
                <Ionicons name="chevron-down" size={16} color={PATIENTS_COLORS.iconosPerfil} />
              </TouchableOpacity>

              {/* Duración */}
              <Text style={styles.fieldLabel}>Duración</Text>
              <View style={styles.chipRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.chip, editDuracion === d.key && styles.chipActive]}
                    onPress={() => setEditDuracion(d.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        editDuracion === d.key && styles.chipTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Modalidad */}
              <Text style={styles.fieldLabel}>Modalidad</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    editModalidad === 'presencial' && styles.chipActive,
                  ]}
                  onPress={() => setEditModalidad('presencial')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={editModalidad === 'presencial' ? PATIENTS_COLORS.iconosPerfil : PATIENTS_COLORS.textoSecundario}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      editModalidad === 'presencial' && styles.chipTextActive,
                    ]}
                  >
                    Presencial
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.chip, editModalidad === 'online' && styles.chipActive]}
                  onPress={() => setEditModalidad('online')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={16}
                    color={editModalidad === 'online' ? PATIENTS_COLORS.iconosPerfil : PATIENTS_COLORS.textoSecundario}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      editModalidad === 'online' && styles.chipTextActive,
                    ]}
                  >
                    Online
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Observaciones */}
              <Text style={styles.fieldLabel}>Observaciones</Text>
              <TextInput
                style={[
                  styles.input,
                  { minHeight: 64, textAlignVertical: 'top', paddingTop: 10 },
                ]}
                placeholder="Observaciones de la sesión..."
                placeholderTextColor={PATIENTS_COLORS.textoSecundario}
                value={editObservaciones}
                onChangeText={setEditObservaciones}
                multiline
              />

              {/* Botón Guardar Modificaciones */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (isUpdating || isDeleting) && { opacity: 0.7 },
                ]}
                onPress={handleSaveEditSession}
                activeOpacity={0.85}
                disabled={isUpdating || isDeleting}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={PATIENTS_COLORS.textoBlanco} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>

              {/* Botón Cancelar / Eliminar Cita */}
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  (isUpdating || isDeleting) && { opacity: 0.7 },
                ]}
                onPress={handleDeleteSession}
                activeOpacity={0.85}
                disabled={isUpdating || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={PATIENTS_COLORS.danger} />
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="trash-outline" size={17} color={PATIENTS_COLORS.danger} />
                    <Text style={styles.deleteButtonText}>Eliminar cita</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={{ marginTop: 10 }}>
                <Text style={styles.cancelText}>Volver</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <DatePickerModal
        visible={showEditDatePicker}
        title="Modificar Fecha de la Sesión"
        initialDate={editFecha || formatDateForInitialPicker(minBookingDate)}
        minDate={minBookingDate}
        maxDate={maxBookingDate}
        yearOrder="asc"
        onClose={() => setShowEditDatePicker(false)}
        onSelectDate={(formattedDate: string) => setEditFecha(formattedDate)}
      />

      <TimePickerModal
        visible={showEditTimePicker}
        selectedTime={editHora || '10:00'}
        selectedDate={editFecha}
        busySessions={busySessionsForEdit}
        duration={Number(editDuracion) || 60}
        title="Modificar hora de la sesión"
        onClose={() => setShowEditTimePicker(false)}
        onSelectTime={(selected) => setEditHora(selected)}
      />
    </>
  );
};

// ── Componente Principal ──────────────────────────────────────────────────

export const PatientDetailScreen: React.FC<PatientDetailScreenProps> = ({
  patient,
  onBack,
  onPatientUpdated,
}) => {
  const { user } = useAuth();
  const isSubscriptionActive = user?.subscription?.isActive ?? true;

  const [currentPatient, setCurrentPatient] = useState<MySqlPatientRecord>(patient);

  useEffect(() => {
    setCurrentPatient(patient);
  }, [patient]);

  const minBookingDate = useMemo(
    () => getMinBookingDate(currentPatient),
    [currentPatient.tipo_relacion, currentPatient.suplente_activo]
  );

  const maxBookingDate = useMemo(
    () => getMaxBookingDate(currentPatient),
    [currentPatient.tipo_relacion, currentPatient.fecha_fin_suplencia]
  );

  const [sessions, setSessions] = useState<AppointmentSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(sessions.length / SESSIONS_PER_PAGE);

  const loadSessions = async () => {
    if (!currentPatient.id) return;
    setLoadingSessions(true);
    try {
      const data = await appointmentService.getPatientAppointments(currentPatient.id);
      setSessions(data);
      setCurrentPage(0);
    } catch (err) {
      console.warn('[PatientDetailScreen] Error al cargar sesiones:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, [currentPatient.id]);

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<AppointmentSession | null>(null);
  const [showHabitFilterModal, setShowHabitFilterModal] = useState(false);
  const navigation = useNavigation<PsychologistNavigationProp>();

  const handleConfirmHabitReport = (filters: HabitReportFilters) => {
    setShowHabitFilterModal(false);
    navigation.navigate('PatientHabitReport', {
      patient: currentPatient,
      filters,
    });
  };

  const openScheduleModal = () => {
    if (!isSubscriptionActive) {
      Alert.alert(
        'Suscripción Finalizada',
        'Suscripción Finalizada comuníquese con el administrador para renovarla'
      );
      return;
    }
    setScheduleModalVisible(true);
  };

  const handleOpenEditModal = (session: AppointmentSession) => {
    if (session.estado === 'Programada') {
      setEditingSession(session);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.tag}>FICHA DEL PACIENTE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PatientRoleBanners patient={currentPatient} />

        <PatientInfoCard patient={currentPatient} />

        {/* Botón de acceso al Informe Visual de Hábitos */}
        <TouchableOpacity
          style={styles.habitsReportButton}
          onPress={() => setShowHabitFilterModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.habitsReportIconWrapper}>
            <Ionicons name="analytics" size={22} color={PATIENTS_COLORS.iconosPerfil} />
          </View>
          <View style={styles.habitsReportTextContainer}>
            <Text style={styles.habitsReportTitle}>Registro de Hábitos</Text>
            <Text style={styles.habitsReportSubtitle}>
              Consultar informe visual con gráficas y promedios
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={PATIENTS_COLORS.iconosPerfil} />
        </TouchableOpacity>

        {/* Botón para Agendar nueva sesión */}
        <TouchableOpacity
          style={[
            styles.scheduleButton,
            !isSubscriptionActive && { opacity: 0.6 },
          ]}
          onPress={openScheduleModal}
          activeOpacity={isSubscriptionActive ? 0.85 : 0.6}
        >
          <View style={styles.scheduleIconWrapper}>
            <Ionicons
              name={isSubscriptionActive ? 'calendar' : 'lock-closed'}
              size={22}
              color={PATIENTS_COLORS.iconosPerfil}
            />
          </View>
          <View style={styles.scheduleTextContainer}>
            <Text style={styles.scheduleTitle}>
              {isSubscriptionActive ? 'Agendar nueva sesión' : 'Agendar sesión (Bloqueado)'}
            </Text>
            <Text style={styles.scheduleSubtitle}>
              {isSubscriptionActive
                ? 'Programa una cita con este paciente'
                : 'Suscripción finalizada: comuníquese con el administrador'}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={PATIENTS_COLORS.iconosPerfil}
          />
        </TouchableOpacity>

        <SessionsHistorySection
          loading={loadingSessions}
          sessions={sessions}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onEditSession={handleOpenEditModal}
        />
      </ScrollView>

      <ScheduleSessionModal
        visible={scheduleModalVisible}
        patient={currentPatient}
        minBookingDate={minBookingDate}
        maxBookingDate={maxBookingDate}
        onClose={() => setScheduleModalVisible(false)}
        onSessionCreated={() => {
          void loadSessions();
          onPatientUpdated?.();
        }}
      />

      <EditSessionModal
        visible={Boolean(editingSession)}
        session={editingSession}
        patient={currentPatient}
        minBookingDate={minBookingDate}
        maxBookingDate={maxBookingDate}
        onClose={() => setEditingSession(null)}
        onSessionUpdated={() => {
          void loadSessions();
          onPatientUpdated?.();
        }}
      />

      <HabitFilterModal
        visible={showHabitFilterModal}
        onClose={() => setShowHabitFilterModal(false)}
        onConfirm={handleConfirmHabitReport}
      />
    </SafeAreaView>
  );
};

// ESTILOS DETALLE PACIENTE

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PATIENTS_COLORS.fondoBase },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: PATIENTS_COLORS.fondoBase,
    marginTop: 25,
  },

  // Reemplazar o agregar estos estilos en el StyleSheet:
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PATIENTS_COLORS.textoPrincipal,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '400',
    color: PATIENTS_COLORS.textoSecundario,
  },

  tag: {
    fontSize: 13, 
    fontWeight: '600', 
    color: PATIENTS_COLORS.textoPrincipal,
    letterSpacing: 0.6, 
  },

  scrollContent: { 
    paddingHorizontal: 20,
    paddingTop: 20, 
    paddingBottom: 40,
  },

  infoCard: {
    backgroundColor: PATIENTS_COLORS.fondoBase,
    borderRadius: 15,
    borderWidth: 0,
    borderColor: PATIENTS_COLORS.bordeIconos,
    padding: 16,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 18,
    
  },

  infoText: {
    fontSize: 14, 
    color: PATIENTS_COLORS.textoSecundario, 
    marginBottom: 6 
  },

  habitsReportButton: {
    backgroundColor: PATIENTS_COLORS.fondoClaro,
    borderRadius: 15,
    padding: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.bordeIconos,
    marginBottom: 16,
  },

  habitsReportIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: PATIENTS_COLORS.fondoBase,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  
  habitsReportTextContainer: {
    flex: 1,
  },
 
  habitsReportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PATIENTS_COLORS.textoPrincipal,
  },

  habitsReportSubtitle: {
    fontSize: 12,
    color: PATIENTS_COLORS.textoSecundario,
    marginTop: 2,
  },

  scheduleButton: {
    backgroundColor: PATIENTS_COLORS.fondoClaro,
    borderRadius: 15,
    padding: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.bordeIconos,
    marginBottom: 24,
    
  },

  scheduleIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PATIENTS_COLORS.fondoBase,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  scheduleTextContainer: {
    flex: 1,
  },

  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PATIENTS_COLORS.textoPrincipal,
  },

  scheduleSubtitle: {
    fontSize: 12,
    color: PATIENTS_COLORS.textoSecundario,
    marginTop: 2,
  },

  historyTitle: { 
    fontSize: 16, 
    fontWeight: '600', color: PATIENTS_COLORS.textoPrincipal, 
    marginBottom: 15,
    marginTop: 10,
  },

  emptyHistoryCard: {
    backgroundColor: PATIENTS_COLORS.fondoBase,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PATIENTS_COLORS.bordeIconos,
    borderStyle: 'dashed',
    
  },
  
  emptyHistoryText: { 
    fontSize: 13, 
    color: PATIENTS_COLORS.textoSecundario, 
    textAlign: 'center', 
    marginTop: 10 
  },
  
  sessionCard: {
    backgroundColor: PATIENTS_COLORS.fondoBase,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PATIENTS_COLORS.bordeHistorial,
    padding: 14,
    marginBottom: 10,
  },
  
  sessionCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },

  sessionDate: { 
    flex: 1,
    fontSize: 13, 
    fontWeight: '600', 
    color: PATIENTS_COLORS.textoHora,
    lineHeight: 18,
  },

  sessionMotivo: { 
    fontSize: 12, 
    color: PATIENTS_COLORS.textoSecundario, 
    marginTop: 2 
  },

  statusBadge: {
    backgroundColor: PATIENTS_COLORS.fondoiconos,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 5,
    borderColor: PATIENTS_COLORS.bordeIconos,
    borderWidth: 1,
  },

  statusBadgeText: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: PATIENTS_COLORS.textoProgramada,
    
  },

  statusBadgeCompleted: { backgroundColor: PATIENTS_COLORS.fondoiconos },
  statusBadgeTextCompleted: { color: PATIENTS_COLORS.estadoCompletada },
  statusBadgeCancelled: { backgroundColor: PATIENTS_COLORS.fondoiconos },
  statusBadgeTextCancelled: { color: PATIENTS_COLORS.danger },
  sessionCardCancelled: {
    backgroundColor: PATIENTS_COLORS.fondoiconos,
    borderColor: PATIENTS_COLORS.bordeIconos,
  },
  sessionDateCancelled: {
    color: PATIENTS_COLORS.textoSecundario,
  },
  sessionMotivoCancelled: {
    color: PATIENTS_COLORS.textoSecundario,
  },

  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
  
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },

  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { fontSize: 13, fontWeight: '600', color: PATIENTS_COLORS.textoSecundario },
  pageButtonTextDisabled: { color: PATIENTS_COLORS.textoSecundario },
  pageIndicator: { fontSize: 13, fontWeight: '600', color: PATIENTS_COLORS.iconosPerfil },

  modalOverlay: {
    flex: 1,
    backgroundColor: PATIENTS_COLORS.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
    backgroundColor: PATIENTS_COLORS.fondoBase,
    borderRadius: 15,
    padding: 20,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PATIENTS_COLORS.textoPrincipal,
    marginBottom: 30,
    textAlign: 'center',
  },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: PATIENTS_COLORS.textoSecundario, marginBottom: 6 },
 
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PATIENTS_COLORS.bordeIconos,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },

  pickerTriggerDisabled: {
    backgroundColor: PATIENTS_COLORS.fondoiconos,
    borderColor: PATIENTS_COLORS.bordeIconos,
  },

  pickerIcon: { marginRight: 10 },

  pickerValueText: { flex: 1, fontSize: 12, fontWeight: '500', color: PATIENTS_COLORS.textoPrincipal },
  
  pickerPlaceholder: { color: PATIENTS_COLORS.textoSecundario, fontWeight: '400' },
  
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  
  chip: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.bordeIconos,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },

  chipActive: { borderColor: PATIENTS_COLORS.iconosPerfil, backgroundColor: PATIENTS_COLORS.fondoClaro},
  
  chipText: { fontSize: 12, fontWeight: '600', color: PATIENTS_COLORS.textoSecundario },
  
  chipTextActive: { color: PATIENTS_COLORS.iconosPerfil, fontWeight: '700' },
  
  input: {
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.bordeIconos,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 14,
    color: PATIENTS_COLORS.textoPrincipal,
    marginBottom: 16,
  },

  saveButton: {
    backgroundColor: PATIENTS_COLORS.iconosPerfil,
    borderRadius: 12,
    paddingVertical: 8,
    width: '30%',
    alignItems: 'center',
    alignSelf: 'center',
  },

  saveButtonText: { color: PATIENTS_COLORS.textoBlanco, fontSize: 14, fontWeight: '600' },
  
  cancelText: {
    color: PATIENTS_COLORS.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  sessionCardRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexShrink: 0,
    gap: 6,
  },

  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PATIENTS_COLORS.fondoBase,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.bordeIconos,
  },

  manageButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: PATIENTS_COLORS.iconosPerfil,
  },

  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 25,
  },

  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PATIENTS_COLORS.textoPrincipal,
  },
  infoBanner: {
    backgroundColor: PATIENTS_COLORS.fondoBase,
    borderRadius: 12,
    padding: 0,
    marginBottom: 30,
  },
  infoBannerText: {
    fontSize: 13,
    color: PATIENTS_COLORS.textoSecundario,
  },

  deleteButton: {
    backgroundColor: PATIENTS_COLORS.fondoiconos,
    borderWidth: 1,
    width: '50%',
    alignSelf: 'center',
    borderColor: PATIENTS_COLORS.bordeIconos,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },

  deleteButtonText: {
    color: PATIENTS_COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },

  suplenteBanner: {
    backgroundColor: PATIENTS_COLORS.infoSurface,
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.infoBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  suplenteBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  suplenteBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: PATIENTS_COLORS.textInfoStrong,
  },
  suplenteBannerText: {
    fontSize: 12.5,
    color: PATIENTS_COLORS.textInfoDark,
    lineHeight: 18,
  },
  titularSuplenciaBanner: {
    backgroundColor: PATIENTS_COLORS.warningSurfaceSoft,
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.borderWarning,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  titularBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: PATIENTS_COLORS.textWarningStrong,
  },
  titularBannerText: {
    fontSize: 12.5,
    color: PATIENTS_COLORS.textWarningDark,
    lineHeight: 18,
    marginBottom: 10,
  },
  doctorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 2,
  },
  doctorBadgeText: {
    flex: 1,
    fontSize: 11,
    color: PATIENTS_COLORS.textoSecundario,
    fontWeight: '600',
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PATIENTS_COLORS.fondoiconos,
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.bordeIconos,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    color: PATIENTS_COLORS.textoSecundario,
    fontWeight: '600',
  },
  substitutionScheduleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PATIENTS_COLORS.warningSurfaceSoft,
    borderWidth: 1,
    borderColor: PATIENTS_COLORS.borderWarning,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  substitutionScheduleNoticeText: {
    flex: 1,
    fontSize: 12,
    color: PATIENTS_COLORS.textWarningStrong,
    lineHeight: 16,
  },
});