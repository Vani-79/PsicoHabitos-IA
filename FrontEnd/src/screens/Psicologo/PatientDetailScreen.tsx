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
import { patientService } from '../../services/patientService';
import { useAuth } from '../../context/AuthContext';
import { formatToChileanDate } from '../../utils/date';

type Duracion = '30' | '45' | '60' | '75' | '90';
type Modalidad = 'presencial' | 'online';

interface PatientDetailScreenProps {
  patient: MySqlPatientRecord;
  onBack: () => void;
  onScheduleSession?: () => void;
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

// ── Helpers de fecha/hora ────────────────────────────────────────────────

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

export const PatientDetailScreen: React.FC<PatientDetailScreenProps> = ({
  patient,
  onBack,
  onPatientUpdated,
}) => {
  const { user } = useAuth();
  const isSubscriptionActive = user?.subscription ? user.subscription.isActive : true;

  const [currentPatient, setCurrentPatient] = useState<MySqlPatientRecord>(patient);

  useEffect(() => {
    setCurrentPatient(patient);
  }, [patient]);

  // Si el psicólogo es TITULAR y el paciente tiene una suplencia activa,
  // se bloquean los días cubiertos por la suplencia (minBookingDate = día siguiente al fin de la suplencia).
  const minBookingDate = useMemo(() => {
    if (currentPatient.tipo_relacion === 'titular' && currentPatient.suplente_activo?.fecha_fin_suplencia) {
      const cleanDateStr = String(currentPatient.suplente_activo.fecha_fin_suplencia).split('T')[0];
      const parts = cleanDateStr.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        const dayAfterSuplencia = new Date(y, m, d + 1, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dayAfterSuplencia > today) {
          return dayAfterSuplencia;
        }
      }
    }
    return new Date();
  }, [currentPatient.tipo_relacion, currentPatient.suplente_activo]);

  // Si el psicólogo es SUPLENTE, no puede agendar más allá de su fecha límite de suplencia.
  const maxBookingDate = useMemo(() => {
    if (currentPatient.tipo_relacion === 'suplente' && currentPatient.fecha_fin_suplencia) {
      const cleanDateStr = String(currentPatient.fecha_fin_suplencia).split('T')[0];
      const parts = cleanDateStr.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        return new Date(y, m, d, 23, 59, 59);
      }
    }
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d;
  }, [currentPatient.tipo_relacion, currentPatient.fecha_fin_suplencia]);

  // Historial de sesiones (de este paciente)
  const [sessions, setSessions] = useState<AppointmentSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(sessions.length / SESSIONS_PER_PAGE);
  const paginatedSessions = sessions.slice(
    currentPage * SESSIONS_PER_PAGE,
    currentPage * SESSIONS_PER_PAGE + SESSIONS_PER_PAGE
  );

  // Modal de agendar sesión
  const [isSaving, setIsSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [duracion, setDuracion] = useState<Duracion | ''>('');
  const [modalidad, setModalidad] = useState<Modalidad | ''>('');
  const [observaciones, setObservaciones] = useState('');

  // Citas ya ocupadas (de TODOS los pacientes del psicólogo) para la fecha elegida
  const [busySessions, setBusySessions] = useState<{ hora: string; duracion: number }[]>([]);

  // Estados para modal de modificar y/o eliminar cita programada
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<AppointmentSession | null>(null);
  const [editFecha, setEditFecha] = useState('');
  const [editHora, setEditHora] = useState('');
  const [editModalidad, setEditModalidad] = useState<Modalidad>('presencial');
  const [editDuracion, setEditDuracion] = useState<Duracion>('60');
  const [editObservaciones, setEditObservaciones] = useState('');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busySessionsForEdit, setBusySessionsForEdit] = useState<{ hora: string; duracion: number }[]>([]);

  const loadSessions = async () => {
    if (!currentPatient.id) return;
    setLoadingSessions(true);
    const data = await appointmentService.getPatientAppointments(currentPatient.id);
    setSessions(data);
    setCurrentPage(0);
    setLoadingSessions(false);
  };

  useEffect(() => {
    loadSessions();
  }, [currentPatient.id]);

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

  // Si cambia la fecha: recarga los horarios ocupados de ese día y
  // revalida que la hora ya elegida (si había una) siga siendo válida.
  useEffect(() => {
    if (fecha && hora && !isTimeStillValid(fecha, hora)) {
      setHora('');
      Alert.alert(
        'Hora ya no disponible',
        'La hora que habías elegido ya pasó para la fecha seleccionada. Por favor, elige una nueva hora.'
      );
    }
    loadBusySessionsForDate(fecha);
  }, [fecha]);

  // Si cambia la duración o los horarios ocupados: comprueba si la hora elegida sigue disponible
  useEffect(() => {
    if (!fecha || !hora || !duracion) return;
    const startMinutes = timeToMinutes(hora);
    const newDuration = Number(duracion) || 60;
    const hasConflict = busySessions.some((b) =>
      rangesOverlap(startMinutes, newDuration, timeToMinutes(b.hora), b.duracion)
    );
    if (hasConflict) {
      setHora('');
      Alert.alert(
        'Hora no disponible',
        'La hora que habías seleccionado se cruza con otra sesión para la duración elegida. Por favor, selecciona una nueva hora.'
      );
    }
  }, [duracion, busySessions]);

  // Reactividad para modal de edición si cambia duración u horarios
  useEffect(() => {
    if (!editFecha || !editHora || !editDuracion) return;
    const startMinutes = timeToMinutes(editHora);
    const newDuration = Number(editDuracion) || 60;
    const hasConflict = busySessionsForEdit.some((b) =>
      rangesOverlap(startMinutes, newDuration, timeToMinutes(b.hora), b.duracion)
    );
    if (hasConflict) {
      setEditHora('');
      Alert.alert(
        'Hora no disponible',
        'La hora seleccionada se cruza con otra sesión para la duración elegida. Por favor, selecciona una nueva hora.'
      );
    }
  }, [editDuracion, busySessionsForEdit]);

  const resetForm = () => {
    setFecha('');
    setHora('');
    setDuracion('');
    setModalidad('');
    setObservaciones('');
    setBusySessions([]);
  };

  const openScheduleModal = () => {
    if (!isSubscriptionActive) {
      Alert.alert(
        'Suscripción Finalizada',
        'Suscripción Finalizada comuníquese con el administrador para renovarla'
      );
      return;
    }
    resetForm();
    setModalVisible(true);
  };

  const handleOpenTimePicker = () => {
    if (!fecha) {
      Alert.alert('Selecciona primero la fecha', 'Elige la fecha de la sesión antes de escoger la hora.');
      return;
    }
    setShowTimePicker(true);
  };

  const hasUnsavedChanges = () => {
  return Boolean(fecha || hora || duracion || modalidad || observaciones.trim());
};

const handleCloseModal = () => {
  if (!hasUnsavedChanges()) {
    setModalVisible(false);
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
          setModalVisible(false);
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
      Alert.alert('Hora inválida', 'La hora seleccionada ya pasó. Por favor, elige una hora futura.');
      setHora('');
      return;
    }
    if (!currentPatient.id) {
      Alert.alert('Error', 'No se encontró el ID del paciente.');
      return;
    }

    // Si es TITULAR y el paciente tiene suplente activo, verificar que la fecha no caiga en el periodo de suplencia
    if (currentPatient.tipo_relacion === 'titular' && currentPatient.suplente_activo?.fecha_fin_suplencia) {
      const suplenteEndStr = String(currentPatient.suplente_activo.fecha_fin_suplencia).split('T')[0];
      if (fecha <= suplenteEndStr) {
        Alert.alert(
          'Día reservado para suplencia',
          `Este paciente se encuentra bajo cobertura del psicólogo suplente (${currentPatient.suplente_activo.nombre}) hasta el ${formatToChileanDate(suplenteEndStr)}.\n\nSolo puedes agendar citas a partir del día siguiente a esa fecha o finalizando la suplencia.`
        );
        return;
      }
    }

    // Si es SUPLENTE, verificar que no agende posterior a su fecha límite de suplencia
    if (currentPatient.tipo_relacion === 'suplente' && currentPatient.fecha_fin_suplencia) {
      const suplenteEndStr = String(currentPatient.fecha_fin_suplencia).split('T')[0];
      if (fecha > suplenteEndStr) {
        Alert.alert(
          'Fecha excede suplencia',
          `Tu periodo de suplencia finaliza el ${formatToChileanDate(suplenteEndStr)}. No puedes programar citas posteriores a esa fecha.`
        );
        return;
      }
    }

    // Choque de horario: bloquea si se cruza con otra sesión existente
    const newStartMinutes = timeToMinutes(hora);
    const newDuration = Number(duracion);
    const hasConflict = busySessions.some((b) =>
      rangesOverlap(newStartMinutes, newDuration, timeToMinutes(b.hora), b.duracion)
    );

    if (hasConflict) {
      Alert.alert(
        'Horario ocupado',
        'Ya existe una sesión que se cruza con este horario y duración. Elige otra hora.'
      );
      setHora('');
      return;
    }

    setIsSaving(true);
    const res = await appointmentService.createAppointment({
      paciente_id: currentPatient.id,
      fecha,
      hora,
      duracion: newDuration,
      modalidad,
      observaciones: observaciones.trim(),
    });
    setIsSaving(false);

    if (res.success) {
      Alert.alert('¡Sesión agendada!', 'La sesión se ha programado exitosamente.');
      setModalVisible(false);
      resetForm();
      loadSessions();
    } else {
      Alert.alert('Error al agendar', res.error || 'No se pudo guardar la sesión.');
    }
  };



  // ── Handlers para Modificar / Cancelar Cita Programada ──────────────────

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

  const handleOpenEditModal = (session: AppointmentSession) => {
    if (session.estado !== 'Programada') return;
    setEditingSession(session);
    setEditFecha(session.fecha);
    setEditHora(session.hora);
    setEditModalidad((session.modalidad === 'online' ? 'online' : 'presencial') as Modalidad);
    const rawDur = String(session.duracion || '60');
    setEditDuracion(['30', '45', '60', '75', '90'].includes(rawDur) ? (rawDur as Duracion) : '60');
    setEditObservaciones(session.observaciones || '');
    loadBusySessionsForEditDate(session.fecha, session.id);
    setEditModalVisible(true);
  };

  const hasEditChanges = () => {
    if (!editingSession) return false;
    return (
      editFecha !== editingSession.fecha ||
      editHora !== editingSession.hora ||
      editModalidad !== (editingSession.modalidad === 'online' ? 'online' : 'presencial') ||
      editDuracion !== String(editingSession.duracion || '60') ||
      editObservaciones.trim() !== (editingSession.observaciones || '').trim()
    );
  };

  const handleCloseEditModal = () => {
    if (!hasEditChanges()) {
      setEditModalVisible(false);
      setEditingSession(null);
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
          onPress: () => {
            setEditModalVisible(false);
            setEditingSession(null);
          },
        },
      ]
    );
  };

  // Recargar ocupados al cambiar fecha en edición
  useEffect(() => {
    if (editModalVisible && editFecha) {
      loadBusySessionsForEditDate(editFecha, editingSession?.id);
      if (editHora && !isTimeStillValid(editFecha, editHora)) {
        setEditHora('');
        Alert.alert('Hora ya no disponible', 'La hora seleccionada ya pasó para la fecha elegida.');
      }
    }
  }, [editFecha, editModalVisible]);

  const handleSaveEditSession = async () => {
    if (!editingSession) return;
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

    // Si es TITULAR y el paciente tiene suplente activo, verificar que la fecha no caiga en el periodo de suplencia
    if (currentPatient.tipo_relacion === 'titular' && currentPatient.suplente_activo?.fecha_fin_suplencia) {
      const suplenteEndStr = String(currentPatient.suplente_activo.fecha_fin_suplencia).split('T')[0];
      if (editFecha <= suplenteEndStr) {
        Alert.alert(
          'Día reservado para suplencia',
          `No puedes reprogramar la cita para una fecha cubierta por la suplencia activa de ${currentPatient.suplente_activo.nombre || 'el suplente'} (hasta el ${formatToChileanDate(suplenteEndStr)}).`
        );
        return;
      }
    }

    // Si es SUPLENTE, verificar que no reprograme posterior a su fecha límite de suplencia
    if (currentPatient.tipo_relacion === 'suplente' && currentPatient.fecha_fin_suplencia) {
      const suplenteEndStr = String(currentPatient.fecha_fin_suplencia).split('T')[0];
      if (editFecha > suplenteEndStr) {
        Alert.alert(
          'Fecha excede suplencia',
          `Tu periodo de suplencia finaliza el ${formatToChileanDate(suplenteEndStr)}. No puedes reprogramar citas posteriores a esa fecha.`
        );
        return;
      }
    }

    const startMin = timeToMinutes(editHora);
    const durMin = Number(editDuracion) || 60;
    const hasConflict = busySessionsForEdit.some((b) =>
      rangesOverlap(startMin, durMin, timeToMinutes(b.hora), b.duracion)
    );

    if (hasConflict) {
      Alert.alert(
        'Horario ocupado',
        'Ya existe otra sesión que se cruza con este horario y duración. Por favor, selecciona otra hora.'
      );
      return;
    }

    Alert.alert(
      'Confirmar modificaciones',
      `¿Deseas guardar los cambios en esta cita?\n\n• Fecha: ${editFecha}\n• Hora: ${editHora} hrs\n• Duración: ${editDuracion} min\n• Modalidad: ${editModalidad === 'online' ? 'Online' : 'Presencial'}`,
      [
        { text: 'Volver a revisar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsUpdating(true);
            const res = await appointmentService.updateAppointment(editingSession.id, {
              fecha: editFecha,
              hora: editHora,
              duracion: durMin,
              modalidad: editModalidad,
              observaciones: editObservaciones.trim(),
            });
            setIsUpdating(false);

            if (res.success) {
              Alert.alert('¡Cita modificada!', 'La sesión ha sido reprogramada exitosamente.');
              setEditModalVisible(false);
              setEditingSession(null);
              await loadSessions();
            } else {
              Alert.alert('Error', res.error || 'No se pudo actualizar la cita.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteSession = () => {
    if (!editingSession) return;
    Alert.alert(
      '¿Cancelar cita programada?',
      `¿Estás seguro de que deseas cancelar la cita del ${formatToChileanDate(editingSession.fecha)} a las ${editingSession.hora} hrs? Esta acción liberará el horario de tu agenda.`,
      [
        { text: 'No, mantener cita', style: 'cancel' },
        {
          text: 'Sí, cancelar cita',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const res = await appointmentService.deleteAppointment(editingSession.id);
            setIsDeleting(false);

            if (res.success) {
              Alert.alert('Cita cancelada', 'La cita programada ha sido eliminada con éxito.');
              setEditModalVisible(false);
              setEditingSession(null);
              await loadSessions();
            } else {
              Alert.alert('Error', res.error || 'No se pudo cancelar la cita.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.tag}>FICHA DEL PACIENTE</Text>
          <Text style={styles.patientName}>
            {currentPatient.nombre} {currentPatient.apellido_paterno} {currentPatient.apellido_materno}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner si el psicólogo está atendiendo como SUPLENTE */}
        {currentPatient.tipo_relacion === 'suplente' && (
          <View style={styles.suplenteBanner}>
            <View style={styles.suplenteBannerHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#1E40AF" />
              <Text style={styles.suplenteBannerTitle}>Atendiendo como Psicólogo Suplente</Text>
            </View>
            <Text style={styles.suplenteBannerText}>
              Tienes cobertura temporal de atención autorizada por el paciente hasta el{' '}
              <Text style={{ fontWeight: '700' }}>
                {currentPatient.fecha_fin_suplencia ? formatToChileanDate(currentPatient.fecha_fin_suplencia) : 'fecha límite'}
              </Text>.
              Puedes acceder a su historial clínico completo y registrar nuevas sesiones.
            </Text>
          </View>
        )}

        {/* Banner si el psicólogo es TITULAR y hay una SUPLENCIA ACTIVA */}
        {currentPatient.tipo_relacion === 'titular' && currentPatient.suplente_activo && (
          <View style={styles.titularSuplenciaBanner}>
            <View style={styles.suplenteBannerHeader}>
              <Ionicons name="information-circle" size={18} color="#92400E" />
              <Text style={styles.titularBannerTitle}>Cobertura de Suplencia Activa</Text>
            </View>
            <Text style={styles.titularBannerText}>
              El especialista <Text style={{ fontWeight: '700' }}>{currentPatient.suplente_activo.nombre}</Text> tiene cobertura temporal activa sobre este paciente
              {currentPatient.suplente_activo.fecha_fin_suplencia ? ` hasta el ${formatToChileanDate(currentPatient.suplente_activo.fecha_fin_suplencia)}` : ''}.
            </Text>
            <Text style={[styles.titularBannerText, { marginTop: 4, fontStyle: 'italic', color: '#78350F' }]}>
              Nota: La revocación o término anticipado de la suplencia es una decisión exclusiva del paciente desde su perfil.
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{currentPatient.edad} años</Text>
          <Text style={styles.infoText}>Correo: {currentPatient.email}</Text>
          <Text style={styles.infoText}>Primera sesión: {formatToChileanDate(currentPatient.fecha_primera_sesion)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.scheduleButton, !isSubscriptionActive && { backgroundColor: '#9CA3AF' }]}
          onPress={openScheduleModal}
          activeOpacity={isSubscriptionActive ? 0.85 : 0.6}
        >
          <View style={styles.scheduleIconWrapper}>
            <Ionicons name={isSubscriptionActive ? 'calendar' : 'lock-closed'} size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scheduleTitle}>
              {isSubscriptionActive ? 'Agendar nueva sesión' : 'Agendar sesión (Bloqueado)'}
            </Text>
            <Text style={styles.scheduleSubtitle}>
              {isSubscriptionActive
                ? 'Programa una cita con este paciente'
                : 'Suscripción finalizada: comuníquese con el administrador'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={isSubscriptionActive ? '#A8DED3' : '#FCA5A5'} />
        </TouchableOpacity>

        <Text style={styles.historyTitle}>Historial de sesiones</Text>

        {loadingSessions ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#0F613B" />
            <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 13 }}>Cargando sesiones...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyHistoryCard}>
            <Ionicons name="calendar-outline" size={36} color="#9CA3AF" />
            <Text style={styles.emptyHistoryText}>
              Aún no hay sesiones agendadas para este paciente.
            </Text>
          </View>
        ) : (
          paginatedSessions.map((session) => {
            const isCancelada = session.estado?.toLowerCase() === 'cancelada';
            const isCompletada = session.estado?.toLowerCase() === 'completada';
            const isProgramada = !isCancelada && !isCompletada;

            return (
              <View
                key={session.id}
                style={[
                  styles.sessionCard,
                  isCancelada && styles.sessionCardCancelled,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sessionDate, isCancelada && styles.sessionDateCancelled]}>
                    {formatToChileanDate(session.fecha)} · {session.hora} {session.horaFin ? `- ${session.horaFin}` : ''} ·{' '}
                    {session.modalidad === 'presencial' ? 'Presencial' : 'Online'}
                  </Text>

                  {session.doctorNombre && (
                    <View style={styles.doctorBadgeRow}>
                      <Ionicons name="shield-checkmark-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                      <Text style={styles.doctorBadgeText}>
                        {session.doctorNombre}
                        {session.tipoEspecialista === 'suplente'
                          ? ' (Suplente)'
                          : session.tipoEspecialista === 'titular_anterior'
                          ? ' (Titular Anterior)'
                          : session.esPropia === false
                          ? ' (Colega)'
                          : ''}
                      </Text>
                    </View>
                  )}

                  {session.observaciones ? (
                    <Text style={[styles.sessionMotivo, isCancelada && styles.sessionMotivoCancelled]}>
                      {session.observaciones}
                    </Text>
                  ) : (
                    <Text style={[styles.sessionMotivo, { fontStyle: 'italic', color: '#9CA3AF' }]}>
                      Sin observaciones registradas
                    </Text>
                  )}
                </View>
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
                      {isCancelada ? 'Cancelada' : isCompletada ? 'Completada' : 'Programada'}
                    </Text>
                  </View>

                  {isProgramada && (
                    session.esPropia !== false ? (
                      <TouchableOpacity
                        style={styles.manageButton}
                        onPress={() => handleOpenEditModal(session)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={13} color="#0F613B" style={{ marginRight: 3 }} />
                        <Text style={styles.manageButtonText}>Modificar</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.readOnlyBadge}>
                        <Ionicons name="lock-closed" size={11} color="#6B7280" style={{ marginRight: 3 }} />
                        <Text style={styles.readOnlyBadgeText}>Solo lectura</Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            );
          })
        )}

        {totalPages > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
              onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={currentPage === 0 ? '#CBD5E1' : '#0F613B'}
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
              onPress={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
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
                color={currentPage >= totalPages - 1 ? '#CBD5E1' : '#0F613B'}
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal para agendar sesión */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Agendar nueva sesión</Text>

              {currentPatient.tipo_relacion === 'titular' && currentPatient.suplente_activo && (
                <View style={styles.substitutionScheduleNotice}>
                  <Ionicons name="information-circle" size={17} color="#92400E" style={{ marginRight: 6 }} />
                  <Text style={styles.substitutionScheduleNoticeText}>
                    Paciente en suplencia activa hasta el{' '}
                    <Text style={{ fontWeight: '700' }}>
                      {formatToChileanDate(currentPatient.suplente_activo.fecha_fin_suplencia)}
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
                <Ionicons name="calendar" size={18} color="#0F613B" style={styles.pickerIcon} />
                <Text style={[styles.pickerValueText, !fecha && styles.pickerPlaceholder]}>
                  {fecha ? formatToChileanDate(fecha) : 'Seleccionar fecha'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>

              {/* Hora (bloqueada hasta elegir fecha) */}
              <Text style={styles.fieldLabel}>Hora</Text>
              <TouchableOpacity
                style={[styles.pickerTrigger, !fecha && styles.pickerTriggerDisabled]}
                onPress={handleOpenTimePicker}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="time"
                  size={18}
                  color={fecha ? '#0F613B' : '#9CA3AF'}
                  style={styles.pickerIcon}
                />
                <Text style={[styles.pickerValueText, !hora && styles.pickerPlaceholder]}>
                  {hora || (fecha ? 'Seleccionar hora' : 'Primero elige la fecha')}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
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
                  <Text style={[styles.chipText, modalidad === 'presencial' && styles.chipTextActive]}>
                    Presencial
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, modalidad === 'online' && styles.chipActive]}
                  onPress={() => setModalidad('online')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, modalidad === 'online' && styles.chipTextActive]}>
                    Online
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Observaciones */}
              <Text style={styles.fieldLabel}>Observaciones</Text>
              <TextInput
                style={[styles.input, { minHeight: 64, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Ej. Seguimiento de ansiedad, evaluación inicial, acuerdos previos..."
                placeholderTextColor="#9CA3AF"
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
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

      {/* DatePickerModal para la fecha de la cita: respeta bloqueos de suplencia */}
      <DatePickerModal
        visible={showDatePicker}
        title="Fecha de la Sesión"
        initialDate={fecha || `${minBookingDate.getFullYear()}-${String(minBookingDate.getMonth() + 1).padStart(2, '0')}-${String(minBookingDate.getDate()).padStart(2, '0')}`}
        minDate={minBookingDate}
        maxDate={maxBookingDate}
        yearOrder="asc"
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(formattedDate: string) => setFecha(formattedDate)}
      />

      {/* TimePickerModal: filtra horas pasadas y horas ya ocupadas ese día considerando duración */}
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

      {/* Modal Pop-up para Modificar o Cancelar Sesión Programada */}
      <Modal
        animationType="fade"
        transparent
        visible={editModalVisible}
        onRequestClose={handleCloseEditModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseEditModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeaderTitle}>Modificar Cita</Text>
                <TouchableOpacity onPress={handleCloseEditModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Paciente: <Text style={{ fontWeight: '700' }}>{patient.nombre} {patient.apellido_paterno}</Text>
                </Text>
              </View>

              {/* Fecha */}
              <Text style={styles.fieldLabel}>Fecha de la sesión</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowEditDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color="#0F613B" style={styles.pickerIcon} />
                <Text style={styles.pickerValueText}>{formatToChileanDate(editFecha)}</Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>

              {/* Hora */}
              <Text style={styles.fieldLabel}>Hora</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowEditTimePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={18} color="#0F613B" style={styles.pickerIcon} />
                <Text style={styles.pickerValueText}>{editHora} hrs</Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
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
                    <Text style={[styles.chipText, editDuracion === d.key && styles.chipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Modalidad */}
              <Text style={styles.fieldLabel}>Modalidad</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, editModalidad === 'presencial' && styles.chipActive]}
                  onPress={() => setEditModalidad('presencial')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={editModalidad === 'presencial' ? '#0F613B' : '#6B7280'}
                  />
                  <Text
                    style={[styles.chipText, editModalidad === 'presencial' && styles.chipTextActive]}
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
                    color={editModalidad === 'online' ? '#0F613B' : '#6B7280'}
                  />
                  <Text
                    style={[styles.chipText, editModalidad === 'online' && styles.chipTextActive]}
                  >
                    Online
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Observaciones */}
              <Text style={styles.fieldLabel}>Observaciones</Text>
              <TextInput
                style={[styles.input, { minHeight: 64, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Observaciones de la sesión..."
                placeholderTextColor="#9CA3AF"
                value={editObservaciones}
                onChangeText={setEditObservaciones}
                multiline
              />

              {/* Botón Guardar Modificaciones */}
              <TouchableOpacity
                style={[styles.saveButton, (isUpdating || isDeleting) && { opacity: 0.7 }]}
                onPress={handleSaveEditSession}
                activeOpacity={0.85}
                disabled={isUpdating || isDeleting}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar modificaciones</Text>
                )}
              </TouchableOpacity>

              {/* Botón Cancelar / Eliminar Cita */}
              <TouchableOpacity
                style={[styles.deleteButton, (isUpdating || isDeleting) && { opacity: 0.7 }]}
                onPress={handleDeleteSession}
                activeOpacity={0.85}
                disabled={isUpdating || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Ionicons name="trash-outline" size={17} color="#DC2626" />
                    <Text style={styles.deleteButtonText}>Cancelar y eliminar cita</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCloseEditModal} style={{ marginTop: 10 }}>
                <Text style={styles.cancelText}>Volver</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* DatePickerModal para editar fecha */}
      <DatePickerModal
        visible={showEditDatePicker}
        title="Modificar Fecha de la Sesión"
        initialDate={editFecha || `${minBookingDate.getFullYear()}-${String(minBookingDate.getMonth() + 1).padStart(2, '0')}-${String(minBookingDate.getDate()).padStart(2, '0')}`}
        minDate={minBookingDate}
        maxDate={maxBookingDate}
        yearOrder="asc"
        onClose={() => setShowEditDatePicker(false)}
        onSelectDate={(formattedDate: string) => setEditFecha(formattedDate)}
      />

      {/* TimePickerModal para editar hora */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  tag: { fontSize: 11, fontWeight: '800', color: '#268D77', letterSpacing: 0.8 },
  patientName: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginTop: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7F0EA',
    borderLeftWidth: 8,
    borderLeftColor: '#3FB889',
    padding: 16,
    marginBottom: 18,
  },
  infoText: { fontSize: 13, color: '#60756D', marginBottom: 6 },
  scheduleButton: {
    backgroundColor: '#0F613B',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F613B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 24,
  },
  scheduleIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  scheduleSubtitle: { color: '#D1E7DD', fontSize: 11.5, marginTop: 2 },

  historyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  emptyHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyHistoryText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 10 },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionDate: { fontSize: 12.5, fontWeight: '600', color: '#374151' },
  sessionMotivo: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { backgroundColor: '#FEF3C7', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  statusBadgeCompleted: { backgroundColor: '#E8F5E9' },
  statusBadgeTextCompleted: { color: '#0F613B' },
  statusBadgeCancelled: { backgroundColor: '#FEE2E2' },
  statusBadgeTextCancelled: { color: '#DC2626' },
  sessionCardCancelled: {
    backgroundColor: '#FAFAFA',
    borderColor: '#F3F4F6',
  },
  sessionDateCancelled: {
    color: '#6B7280',
  },
  sessionMotivoCancelled: {
    color: '#9CA3AF',
  },

  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { fontSize: 13.5, fontWeight: '700', color: '#0F613B' },
  pageButtonTextDisabled: { color: '#CBD5E1' },
  pageIndicator: { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 14, textAlign: 'center' },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: '#4A5568', marginBottom: 6 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  pickerTriggerDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  pickerIcon: { marginRight: 10 },
  pickerValueText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' },
  pickerPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    flexGrow: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  chipActive: { borderColor: '#0F613B', backgroundColor: '#E8F5E9' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#0F613B', fontWeight: '700' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
  },
  saveButton: { backgroundColor: '#0F613B', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '700' },
  cancelText: { color: '#6B7280', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },

  sessionCardRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBE5D6',
  },
  manageButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F613B',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoBanner: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  infoBannerText: {
    fontSize: 12.5,
    color: '#4B5563',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  suplenteBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    color: '#1E40AF',
  },
  suplenteBannerText: {
    fontSize: 12.5,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  titularSuplenciaBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  titularBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#92400E',
  },
  titularBannerText: {
    fontSize: 12.5,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 10,
  },
  endSuplenciaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  endSuplenciaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  doctorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 2,
  },
  doctorBadgeText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  substitutionScheduleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  substitutionScheduleNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
});
