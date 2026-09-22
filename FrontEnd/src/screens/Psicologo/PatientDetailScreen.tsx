import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MySqlPatientRecord } from '../../types/patient';
import { DatePickerModal } from '../../components/DatePickerModal';

type Duracion = '30' | '45' | '60';
type Modalidad = 'presencial' | 'online';

interface Session {
  id: string;
  fecha: string;
  hora: string;
  duracion: Duracion;
  modalidad: Modalidad;
  motivo: string;
  estado: 'Programada' | 'Completada';
}

interface PatientDetailScreenProps {
  patient: MySqlPatientRecord;
  onBack: () => void;
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

const DURATIONS: { key: Duracion; label: string }[] = [
  { key: '30', label: '30 min' },
  { key: '45', label: '45 min' },
  { key: '60', label: '60 min' },
];

export const PatientDetailScreen: React.FC<PatientDetailScreenProps> = ({
  patient,
  onBack,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [duracion, setDuracion] = useState<Duracion>('30');
  const [modalidad, setModalidad] = useState<Modalidad>('presencial');
  const [motivo, setMotivo] = useState('');

  const resetForm = () => {
    setFecha('');
    setHora('');
    setDuracion('30');
    setModalidad('presencial');
    setMotivo('');
  };

  const openScheduleModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleSaveSession = () => {
    if (!fecha || !hora || !motivo.trim()) {
      Alert.alert('Campos incompletos', 'Selecciona fecha, hora y escribe el motivo de la sesión.');
      return;
    }

    const newSession: Session = {
      id: `${Date.now()}`,
      fecha,
      hora,
      duracion,
      modalidad,
      motivo: motivo.trim(),
      estado: 'Programada',
    };

    setSessions((prev) => [newSession, ...prev]);
    setModalVisible(false);
    resetForm();
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
          style={styles.scheduleButton}
          onPress={openScheduleModal}
          activeOpacity={0.85}
        >
          <View style={styles.scheduleIconWrapper}>
            <Ionicons name="calendar" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scheduleTitle}>Agendar nueva sesión</Text>
            <Text style={styles.scheduleSubtitle}>Programa una cita con este paciente</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#A8DED3" />
        </TouchableOpacity>

        <Text style={styles.historyTitle}>Historial de sesiones</Text>

        {sessions.length === 0 ? (
          <View style={styles.emptyHistoryCard}>
            <Ionicons name="calendar-outline" size={36} color="#9CA3AF" />
            <Text style={styles.emptyHistoryText}>
              Aún no hay sesiones agendadas para este paciente.
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDate}>
                  {session.fecha} · {session.hora} · {session.duracion} min ·{' '}
                  {session.modalidad === 'presencial' ? 'Presencial' : 'Online'}
                </Text>
                <Text style={styles.sessionMotivo}>{session.motivo}</Text>
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
      </ScrollView>

      {/* Modal para agendar sesión */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
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

              {/* Hora */}
              <Text style={styles.fieldLabel}>Hora</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time" size={18} color="#0F613B" style={styles.pickerIcon} />
                <Text style={[styles.pickerValueText, !hora && styles.pickerPlaceholder]}>
                  {hora || 'Seleccionar hora'}
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

              {/* Motivo */}
              <Text style={styles.fieldLabel}>Motivo de la sesión</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Sesión de seguimiento"
                placeholderTextColor="#9CA3AF"
                value={motivo}
                onChangeText={setMotivo}
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSession}
                activeOpacity={0.85}
              >
                <Text style={styles.saveButtonText}>Guardar sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 8 }}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reutiliza tu DatePickerModal existente */}
      <DatePickerModal
        visible={showDatePicker}
        title="Fecha de la Sesión"
        initialDate={fecha || new Date().toISOString().split('T')[0]}
        maxDate={new Date(2030, 11, 31)}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(formattedDate: string) => setFecha(formattedDate)}
      />

      {/* Selector simple de hora (lista de horarios) */}
      <Modal
        animationType="fade"
        transparent
        visible={showTimePicker}
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTimePicker(false)}>
          <Pressable style={styles.timeModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Selecciona la hora</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeOption, hora === slot && styles.timeOptionActive]}
                  onPress={() => {
                    setHora(slot);
                    setShowTimePicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.timeOptionText, hora === slot && styles.timeOptionTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
    borderColor: '#6cb59388',
    borderLeftWidth: 8,
    borderLeftColor: '#6CB593',
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
  timeModalContent: {
    width: '100%',
    maxWidth: 300,
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
  pickerIcon: { marginRight: 10 },
  pickerValueText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1F2937' },
  pickerPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    flex: 1,
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

  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  timeOptionActive: { backgroundColor: '#E8F5E9' },
  timeOptionText: { fontSize: 15, fontWeight: '500', color: '#374151', textAlign: 'center' },
  timeOptionTextActive: { color: '#0F613B', fontWeight: '700' },
});
