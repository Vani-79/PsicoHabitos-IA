import React, { useState, useEffect } from 'react';
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

type Duracion = '30' | '45' | '60' | '75' | '90';
type Modalidad = 'presencial' | 'online';

interface PatientDetailScreenProps {
  patient: MySqlPatientRecord;
  onBack: () => void;
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
}) => {
  const { user } = useAuth();
  const isSubscriptionActive = user?.subscription ? user.subscription.isActive : true;

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

  const loadSessions = async () => {
    if (!patient.id) return;
    setLoadingSessions(true);
    const data = await appointmentService.getPatientAppointments(patient.id);
    setSessions(data);
    setCurrentPage(0);
    setLoadingSessions(false);
  };

  useEffect(() => {
    loadSessions();
  }, [patient.id]);

  const loadBusySessionsForDate = async (dateStr: string) => {
    if (!dateStr) {
      setBusySessions([]);
      return;
    }
    try {
      // ⚠️ Ajusta el nombre/parámetros si tu appointmentService usa otros distintos.
      const monthStr = dateStr.slice(0, 7); // 'YYYY-MM'
      const monthAppointments = await appointmentService.getPsychologistCalendar({ month: monthStr });

      const busyForDay = monthAppointments
        .filter((a) => a.fecha === dateStr && a.estado !== 'Cancelada')
        .map((a) => ({ hora: a.hora, duracion: Number(a.duracion) || 60 }));

      setBusySessions(busyForDay);
    } catch (err) {
      console.warn('Error al cargar horarios ocupados:', err);
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
    if (!patient.id) {
      Alert.alert('Error', 'No se encontró el ID del paciente.');
      return;
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
      setModalVisible(false);
      resetForm();
      loadSessions();
    } else {
      Alert.alert('Error al agendar', res.error || 'No se pudo guardar la sesión.');
    }
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
            {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>{patient.edad} años</Text>
          <Text style={styles.infoText}>Correo: {patient.email}</Text>
          <Text style={styles.infoText}>Primera sesión: {patient.fecha_primera_sesion}</Text>
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
          paginatedSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDate}>
                  {session.fecha} · {session.hora} {session.horaFin ? `- ${session.horaFin}` : ''} · {session.duracion} min ·{' '}
                  {session.modalidad === 'presencial' ? 'Presencial' : 'Online'}
                </Text>
                {session.observaciones ? (
                  <Text style={styles.sessionMotivo}>{session.observaciones}</Text>
                ) : (
                  <Text style={[styles.sessionMotivo, { fontStyle: 'italic', color: '#9CA3AF' }]}>
                    Sin observaciones registradas
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.statusBadge,
                  session.estado === 'Completada' && styles.statusBadgeCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    session.estado === 'Completada' && styles.statusBadgeTextCompleted,
                  ]}
                >
                  {session.estado}
                </Text>
              </View>
            </View>
          ))
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

              {/* Fecha */}
              <Text style={styles.fieldLabel}>Fecha</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={18} color="#0F613B" style={styles.pickerIcon} />
                <Text style={[styles.pickerValueText, !fecha && styles.pickerPlaceholder]}>
                  {fecha || 'Seleccionar fecha'}
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

      {/* DatePickerModal para la fecha de la cita: solo hoy en adelante, hasta 6 meses */}
      <DatePickerModal
        visible={showDatePicker}
        title="Fecha de la Sesión"
        initialDate={fecha || getTodayStr()}
        minDate={new Date()}
        maxDate={new Date(new Date().setMonth(new Date().getMonth() + 6))}
        yearOrder="asc"
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(formattedDate: string) => setFecha(formattedDate)}
      />

      {/* TimePickerModal: filtra horas pasadas y horas ya ocupadas ese día */}
      <TimePickerModal
        visible={showTimePicker}
        selectedTime={hora || '10:00'}
        selectedDate={fecha}
        busySessions={busySessions}
        title="Selecciona la hora de la sesión"
        onClose={() => setShowTimePicker(false)}
        onSelectTime={(selected) => setHora(selected)}
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
});
