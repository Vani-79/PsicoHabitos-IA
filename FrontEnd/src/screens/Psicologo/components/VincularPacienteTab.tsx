import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerModal } from '../../../components/DatePickerModal';
import { TimePickerModal } from '../../../components/TimePickerModal';
import { patientService } from '../../../services/patientService';
import { appointmentService } from '../../../services/appointmentService';
import {
  PatientLookupResult,
  MySqlPatientRecord,
} from '../../../types/patient';
import { formatToChileanDate } from '../../../utils/date';

const SESSION_DURATIONS = [
  { key: '30', label: '30 min' },
  { key: '45', label: '45 min' },
  { key: '60', label: '60 min' },
  { key: '75', label: '75 min' },
  { key: '90', label: '90 min' },
];

const rangesOverlap = (
  start1: number,
  dur1: number,
  start2: number,
  dur2: number
) => {
  return start1 < start2 + dur2 && start2 < start1 + dur1;
};

const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const formatFullDateSpanish = (dateStr: string): string => {
  return formatToChileanDate(dateStr);
};

const isValidEmail = (email: string): boolean => {
  const clean = email.trim().toLowerCase();
  return Boolean(clean && clean.includes('@') && clean.includes('.'));
};

const getTomorrowFormatted = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getSuplenciaDate = (relation: 'suplente' | 'titular', endDate: string): string | null => {
  return relation === 'suplente' ? endDate : null;
};

const checkTimeConflict = (
  busyList: { hora: string; duracion: number }[],
  sessionTime: string,
  durationStr: string
): boolean => {
  const newDur = Number(durationStr) || 60;
  const newStart = timeToMinutes(sessionTime);
  return busyList.some((b) => rangesOverlap(newStart, newDur, timeToMinutes(b.hora), b.duracion));
};

const fetchBusySessions = async (date: string): Promise<{ hora: string; duracion: number }[]> => {
  if (!date) return [];
  try {
    const dayAppointments = await appointmentService.getPsychologistCalendar({ date });
    return dayAppointments
      .filter((a) => a.estado !== 'Cancelada')
      .map((a) => ({
        hora: a.hora,
        duracion: Number(a.duracion) || 60,
      }));
  } catch {
    return [];
  }
};

const validateLookupResult = (res: PatientLookupResult): { title: string; message: string } | null => {
  if (!res.success && res.message) {
    return { title: 'Búsqueda', message: res.message };
  }
  if (!res.exists || !res.patient) {
    return {
      title: 'Paciente no encontrado',
      message:
        'No se encontró ningún expediente registrado con este correo. Puedes crear su registro desde la pestaña "Paciente nuevo".',
    };
  }
  if (res.alreadyAssigned) {
    return {
      title: 'Ya asignado',
      message: res.message || 'Este paciente ya se encuentra actualmente en tu lista clínica activa.',
    };
  }
  return null;
};

// =================== SUB-COMPONENTES DE PASOS ===================

const StepIndicator: React.FC<{ step: number }> = ({ step }) => (
  <View style={styles.stepIndicator}>
    <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
      <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
    </View>
    <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
    <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
      <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
    </View>
    <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
    <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
      <Text style={[styles.stepDotText, step >= 3 && styles.stepDotTextActive]}>3</Text>
    </View>
  </View>
);

interface Step1SearchProps {
  searchEmail: string;
  setSearchEmail: (val: string) => void;
  isSearching: boolean;
  onSearch: () => void;
}

const Step1Search: React.FC<Step1SearchProps> = ({
  searchEmail,
  setSearchEmail,
  isSearching,
  onSearch,
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeaderIcon}>
      <Ionicons name="search" size={24} color="#0F613B" />
    </View>
    <Text style={styles.cardTitle}>Buscar paciente registrado</Text>
    <Text style={styles.cardSubtitle}>
      Ingresa el correo electrónico del paciente para verificar si ya posee un expediente clínico en PsicoHábitos.
    </Text>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Correo del paciente</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="ejemplo@correo.com"
          placeholderTextColor="#9CA3AF"
          value={searchEmail}
          onChangeText={setSearchEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>

    <TouchableOpacity
      style={[styles.primaryButton, isSearching && styles.buttonDisabled]}
      onPress={onSearch}
      disabled={isSearching}
    >
      {isSearching ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          <Text style={styles.primaryButtonText}>Buscar paciente</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </>
      )}
    </TouchableOpacity>
  </View>
);

interface Step2ModalityProps {
  lookupData: PatientLookupResult;
  selectedRelation: 'suplente' | 'titular';
  setSelectedRelation: (val: 'suplente' | 'titular') => void;
  endDateSuplencia: string;
  onOpenDatePicker: () => void;
  onBack: () => void;
  onSendOtp: () => void;
  isSendingOtp: boolean;
}

const Step2Modality: React.FC<Step2ModalityProps> = ({
  lookupData,
  selectedRelation,
  setSelectedRelation,
  endDateSuplencia,
  onOpenDatePicker,
  onBack,
  onSendOtp,
  isSendingOtp,
}) => {
  const patient = lookupData.patient;
  if (!patient) return null;

  return (
    <View style={styles.card}>
      <View style={styles.patientInfoBox}>
        <View style={styles.patientAvatar}>
          <Ionicons name="person" size={22} color="#0F613B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>
            {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno}
          </Text>
          <Text style={styles.patientSub}>
            {patient.edad} años • {patient.email}
          </Text>
        </View>
      </View>

      {Boolean(lookupData.hasTitular && lookupData.currentSpecialist) && (
        <View style={styles.titularAlertBox}>
          <Ionicons name="shield-checkmark" size={20} color="#1D4ED8" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.titularAlertTitle}>Paciente con especialista asignado</Text>
            <Text style={styles.titularAlertText}>
              Supervisado actualmente por: <Text style={{ fontWeight: '700' }}>{lookupData.currentSpecialist}</Text>
            </Text>
          </View>
        </View>
      )}

      {Boolean(lookupData.currentSuplente) && (
        <View style={styles.suplenteNoticeBox}>
          <Ionicons name="time-outline" size={18} color="#D97706" />
          <Text style={styles.suplenteNoticeText}>
            Suplencia actual: {lookupData.currentSuplente}
            {lookupData.suplenteInfo?.fecha_fin_suplencia
              ? ` (hasta el ${formatFullDateSpanish(lookupData.suplenteInfo.fecha_fin_suplencia)})`
              : ''}
          </Text>
        </View>
      )}

      <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Selecciona la modalidad de vinculación:</Text>

      <TouchableOpacity
        style={[styles.modeCard, selectedRelation === 'suplente' && styles.modeCardSelected]}
        onPress={() => setSelectedRelation('suplente')}
      >
        <View style={styles.modeCardHeader}>
          <View style={[styles.radioDot, selectedRelation === 'suplente' && styles.radioDotActive]} />
          <Text style={styles.modeCardTitle}>🟡 Psicólogo Suplente (Temporal)</Text>
        </View>
        <Text style={styles.modeCardDesc}>
          Cobertura por vacaciones, licencias o ausencias. Mantendrás acceso temporal a sus sesiones y registros durante el período establecido.
        </Text>
      </TouchableOpacity>

      {selectedRelation === 'suplente' && (
        <View style={[styles.inputGroup, { marginTop: 12 }]}>
          <Text style={styles.label}>
            Fecha de término de la suplencia <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <TouchableOpacity style={styles.dateSelector} onPress={onOpenDatePicker}>
            <Ionicons name="calendar-outline" size={20} color="#0F613B" />
            <Text style={[styles.dateSelectorText, !endDateSuplencia && styles.placeholderText]}>
              {endDateSuplencia ? formatFullDateSpanish(endDateSuplencia) : 'Seleccionar fecha de término'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.modeCard, selectedRelation === 'titular' && styles.modeCardSelected, { marginTop: 12 }]}
        onPress={() => setSelectedRelation('titular')}
      >
        <View style={styles.modeCardHeader}>
          <View style={[styles.radioDot, selectedRelation === 'titular' && styles.radioDotActive]} />
          <Text style={styles.modeCardTitle}>🔵 Psicólogo Titular (Permanente)</Text>
        </View>
        <Text style={styles.modeCardDesc}>
          Traspaso formal y definitivo de la custodia terapéutica. El especialista previo dejará de tener acceso activo a los nuevos registros del paciente.
        </Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color="#4B5563" />
          <Text style={styles.secondaryButtonText}>Volver</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1, marginLeft: 10 }, isSendingOtp && styles.buttonDisabled]}
          onPress={onSendOtp}
          disabled={isSendingOtp}
        >
          {isSendingOtp ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Enviar Código</Text>
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface Step3OtpSessionProps {
  patientEmail: string;
  selectedRelation: 'suplente' | 'titular';
  otpCode: string;
  setOtpCode: (val: string) => void;
  onResendOtp: () => void;
  firstSessionDate: string;
  onOpenDatePicker: () => void;
  firstSessionTime: string;
  onOpenTimePicker: () => void;
  firstSessionModality: 'presencial' | 'online';
  setFirstSessionModality: (val: 'presencial' | 'online') => void;
  firstSessionDuration: string;
  setFirstSessionDuration: (val: string) => void;
  firstSessionNotes: string;
  setFirstSessionNotes: (val: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  isSendingOtp: boolean;
}

const Step3OtpSession: React.FC<Step3OtpSessionProps> = ({
  patientEmail,
  selectedRelation,
  otpCode,
  setOtpCode,
  onResendOtp,
  firstSessionDate,
  onOpenDatePicker,
  firstSessionTime,
  onOpenTimePicker,
  firstSessionModality,
  setFirstSessionModality,
  firstSessionDuration,
  setFirstSessionDuration,
  firstSessionNotes,
  setFirstSessionNotes,
  onBack,
  onConfirm,
  isSubmitting,
  isSendingOtp,
}) => (
  <View style={styles.card}>
    <View style={styles.otpBanner}>
      <Ionicons name="mail-unread" size={22} color="#0F613B" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.otpBannerTitle}>Autorización requerida por Ley 21.719</Text>
        <Text style={styles.otpBannerText}>
          Se envió un código de 6 dígitos a <Text style={{ fontWeight: '700' }}>{patientEmail}</Text>. Pide al paciente que revise su correo.
        </Text>
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        Código de autorización (6 dígitos) <Text style={{ color: '#EF4444' }}>*</Text>
      </Text>
      <TextInput
        style={styles.otpInput}
        placeholder="000000"
        placeholderTextColor="#9CA3AF"
        value={otpCode}
        onChangeText={(text) => setOtpCode(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity onPress={onResendOtp} disabled={isSendingOtp} style={{ marginTop: 6, alignSelf: 'flex-end' }}>
        <Text style={styles.resendText}>¿No recibió el código? Reenviar</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.divider} />
    <Text style={styles.sectionHeaderTitle}>📅 Agendar Primera Sesión Clínica</Text>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Fecha de la sesión</Text>
      <TouchableOpacity style={styles.dateSelector} onPress={onOpenDatePicker}>
        <Ionicons name="calendar-outline" size={20} color="#0F613B" />
        <Text style={[styles.dateSelectorText, !firstSessionDate && styles.placeholderText]}>
          {firstSessionDate ? formatFullDateSpanish(firstSessionDate) : 'Seleccionar fecha'}
        </Text>
      </TouchableOpacity>
    </View>

    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
        <Text style={styles.label}>Hora de inicio</Text>
        <TouchableOpacity style={styles.dateSelector} onPress={onOpenTimePicker}>
          <Ionicons name="time-outline" size={20} color="#0F613B" />
          <Text style={styles.dateSelectorText}>{firstSessionTime}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
        <Text style={styles.label}>Modalidad</Text>
        <View style={styles.modalityToggle}>
          <TouchableOpacity
            style={[styles.modalityBtn, firstSessionModality === 'presencial' && styles.modalityBtnActive]}
            onPress={() => setFirstSessionModality('presencial')}
          >
            <Text
              style={[
                styles.modalityBtnText,
                firstSessionModality === 'presencial' && styles.modalityBtnTextActive,
              ]}
            >
              Presencial
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalityBtn, firstSessionModality === 'online' && styles.modalityBtnActive]}
            onPress={() => setFirstSessionModality('online')}
          >
            <Text
              style={[
                styles.modalityBtnText,
                firstSessionModality === 'online' && styles.modalityBtnTextActive,
              ]}
            >
              Online
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Duración de la sesión</Text>
      <View style={styles.durationRow}>
        {SESSION_DURATIONS.map((dur) => (
          <TouchableOpacity
            key={dur.key}
            style={[styles.durBtn, firstSessionDuration === dur.key && styles.durBtnActive]}
            onPress={() => setFirstSessionDuration(dur.key)}
          >
            <Text style={[styles.durBtnText, firstSessionDuration === dur.key && styles.durBtnTextActive]}>
              {dur.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Observaciones o motivo (opcional)</Text>
      <TextInput
        style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
        placeholder={`Primera sesión (${selectedRelation === 'suplente' ? 'Suplencia' : 'Titular'})`}
        placeholderTextColor="#9CA3AF"
        value={firstSessionNotes}
        onChangeText={setFirstSessionNotes}
        multiline
      />
    </View>

    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={18} color="#4B5563" />
        <Text style={styles.secondaryButtonText}>Volver</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, { flex: 1, marginLeft: 10 }, isSubmitting && styles.buttonDisabled]}
        onPress={onConfirm}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Vincular y Agendar</Text>
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

// =================== CUSTOM HOOK DE LÓGICA ===================

const useVincularPaciente = (onLinkSuccess: (record: MySqlPatientRecord) => void) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Paso 1: Búsqueda
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupData, setLookupData] = useState<PatientLookupResult | null>(null);

  // Paso 2: Modalidad
  const [selectedRelation, setSelectedRelation] = useState<'suplente' | 'titular'>('suplente');
  const [endDateSuplencia, setEndDateSuplencia] = useState('');
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Paso 3: Código OTP y Primera Sesión
  const [otpCode, setOtpCode] = useState('');
  const [firstSessionDate, setFirstSessionDate] = useState('');
  const [firstSessionTime, setFirstSessionTime] = useState('10:00');
  const [firstSessionDuration, setFirstSessionDuration] = useState('60');
  const [firstSessionModality, setFirstSessionModality] = useState<'presencial' | 'online'>('presencial');
  const [firstSessionNotes, setFirstSessionNotes] = useState('');
  const [showSessionDatePicker, setShowSessionDatePicker] = useState(false);
  const [showSessionTimePicker, setShowSessionTimePicker] = useState(false);
  const [busySessions, setBusySessions] = useState<{ hora: string; duracion: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void fetchBusySessions(firstSessionDate)
      .then((busy) => {
        if (isMounted) setBusySessions(busy);
      })
      .catch((error) => {
        console.error('Error al obtener sesiones ocupadas:', error);
      });
    return () => {
      isMounted = false;
    };
  }, [firstSessionDate]);

  const handleSearchPatient = async () => {
    const clean = searchEmail.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico válido.');
      return;
    }

    setIsSearching(true);
    try {
      const res = await patientService.lookupPatient(clean);
      const validationError = validateLookupResult(res);
      if (validationError) {
        Alert.alert(validationError.title, validationError.message);
        return;
      }
      setLookupData(res);
      setStep(2);
    } catch {
      Alert.alert('Error', 'No se pudo conectar con el servidor para buscar al paciente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendOtp = async () => {
    if (!lookupData?.patient) return;

    if (selectedRelation === 'suplente' && !endDateSuplencia) {
      Alert.alert(
        'Fecha obligatoria',
        'Para la modalidad de suplencia temporal es obligatorio definir la fecha de término de la cobertura.'
      );
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await patientService.sendTitularOtp({
        paciente_id: lookupData.patient.id,
        tipo_relacion: selectedRelation,
        fecha_fin_suplencia: getSuplenciaDate(selectedRelation, endDateSuplencia),
      });

      if (res.success) {
        Alert.alert(
          'Código enviado',
          `Se ha enviado un código de autorización de 6 dígitos al correo del paciente (${lookupData.patient.email}). Solicita este código para completar la vinculación.`
        );
        if (!firstSessionDate) {
          setFirstSessionDate(getTomorrowFormatted());
        }
        setStep(3);
      } else {
        Alert.alert('Error', res.error || 'No se pudo enviar el código de autorización.');
      }
    } catch {
      Alert.alert('Error', 'Error de conexión al enviar el código de autorización.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!lookupData?.patient) return;
    setIsSendingOtp(true);
    try {
      const res = await patientService.sendTitularOtp({
        paciente_id: lookupData.patient.id,
        tipo_relacion: selectedRelation,
        fecha_fin_suplencia: getSuplenciaDate(selectedRelation, endDateSuplencia),
      });
      if (res.success) {
        Alert.alert('Código reenviado', 'Se ha generado y enviado un nuevo código de autorización.');
      } else {
        Alert.alert('Error', res.error || 'No se pudo reenviar el código.');
      }
    } catch {
      Alert.alert('Error', 'Error de conexión.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const validateLinkingForm = (cleanOtp: string): boolean => {
    if (cleanOtp?.length !== 6) {
      Alert.alert('Código incompleto', 'Por favor ingresa el código numérico de 6 dígitos.');
      return false;
    }
    if (!firstSessionDate) {
      Alert.alert('Fecha requerida', 'Por favor selecciona la fecha de la primera sesión clínica.');
      return false;
    }
    if (checkTimeConflict(busySessions, firstSessionTime, firstSessionDuration)) {
      Alert.alert(
        'Conflicto de horario',
        'Ya tienes una sesión programada que se cruza con este horario. Por favor selecciona otra hora.'
      );
      return false;
    }
    return true;
  };

  const handleConfirmLinking = async () => {
    if (!lookupData?.patient) return;

    const cleanOtp = otpCode.trim();
    if (!validateLinkingForm(cleanOtp)) return;

    const newDur = Number(firstSessionDuration) || 60;
    setIsSubmitting(true);
    try {
      const res = await patientService.linkExistingPatient({
        paciente_id: lookupData.patient.id,
        tipo_relacion: selectedRelation,
        fecha_fin_suplencia: getSuplenciaDate(selectedRelation, endDateSuplencia),
        fecha_primera_sesion: firstSessionDate,
        hora_primera_sesion: firstSessionTime,
        duracion_primera_sesion: newDur,
        modalidad_primera_sesion: firstSessionModality,
        observaciones_primera_sesion: firstSessionNotes.trim() || undefined,
        codigo_otp: cleanOtp,
      });

      if (res.success && res.data) {
        const successMessage =
          selectedRelation === 'suplente'
            ? 'El paciente ha sido vinculado bajo la modalidad de suplencia temporal.'
            : 'El traspaso de titularidad ha sido formalizado exitosamente.';

        Alert.alert('¡Vinculación Exitosa!', successMessage, [
          {
            text: 'Aceptar',
            onPress: () => onLinkSuccess(res.data!),
          },
        ]);
      } else {
        Alert.alert('Error al vincular', res.error || 'Código incorrecto o expirado.');
      }
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor para formalizar la vinculación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step,
    setStep,
    searchEmail,
    setSearchEmail,
    isSearching,
    lookupData,
    selectedRelation,
    setSelectedRelation,
    endDateSuplencia,
    setEndDateSuplencia,
    showEndDatePicker,
    setShowEndDatePicker,
    isSendingOtp,
    otpCode,
    setOtpCode,
    firstSessionDate,
    setFirstSessionDate,
    firstSessionTime,
    setFirstSessionTime,
    firstSessionDuration,
    setFirstSessionDuration,
    firstSessionModality,
    setFirstSessionModality,
    firstSessionNotes,
    setFirstSessionNotes,
    showSessionDatePicker,
    setShowSessionDatePicker,
    showSessionTimePicker,
    setShowSessionTimePicker,
    busySessions,
    isSubmitting,
    handleSearchPatient,
    handleSendOtp,
    handleResendOtp,
    handleConfirmLinking,
  };
};

// =================== COMPONENTE PRINCIPAL ===================

interface VincularPacienteTabProps {
  onLinkSuccess: (record: MySqlPatientRecord) => void;
}

export const VincularPacienteTab: React.FC<VincularPacienteTabProps> = ({
  onLinkSuccess,
}) => {
  const {
    step,
    setStep,
    searchEmail,
    setSearchEmail,
    isSearching,
    lookupData,
    selectedRelation,
    setSelectedRelation,
    endDateSuplencia,
    setEndDateSuplencia,
    showEndDatePicker,
    setShowEndDatePicker,
    isSendingOtp,
    otpCode,
    setOtpCode,
    firstSessionDate,
    setFirstSessionDate,
    firstSessionTime,
    setFirstSessionTime,
    firstSessionDuration,
    setFirstSessionDuration,
    firstSessionModality,
    setFirstSessionModality,
    firstSessionNotes,
    setFirstSessionNotes,
    showSessionDatePicker,
    setShowSessionDatePicker,
    showSessionTimePicker,
    setShowSessionTimePicker,
    busySessions,
    isSubmitting,
    handleSearchPatient,
    handleSendOtp,
    handleResendOtp,
    handleConfirmLinking,
  } = useVincularPaciente(onLinkSuccess);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StepIndicator step={step} />

      {step === 1 && (
        <Step1Search
          searchEmail={searchEmail}
          setSearchEmail={setSearchEmail}
          isSearching={isSearching}
          onSearch={handleSearchPatient}
        />
      )}

      {step === 2 && lookupData?.patient && (
        <Step2Modality
          lookupData={lookupData}
          selectedRelation={selectedRelation}
          setSelectedRelation={setSelectedRelation}
          endDateSuplencia={endDateSuplencia}
          onOpenDatePicker={() => setShowEndDatePicker(true)}
          onBack={() => setStep(1)}
          onSendOtp={handleSendOtp}
          isSendingOtp={isSendingOtp}
        />
      )}

      {step === 3 && lookupData?.patient && (
        <Step3OtpSession
          patientEmail={lookupData.patient.email}
          selectedRelation={selectedRelation}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          onResendOtp={handleResendOtp}
          firstSessionDate={firstSessionDate}
          onOpenDatePicker={() => setShowSessionDatePicker(true)}
          firstSessionTime={firstSessionTime}
          onOpenTimePicker={() => setShowSessionTimePicker(true)}
          firstSessionModality={firstSessionModality}
          setFirstSessionModality={setFirstSessionModality}
          firstSessionDuration={firstSessionDuration}
          setFirstSessionDuration={setFirstSessionDuration}
          firstSessionNotes={firstSessionNotes}
          setFirstSessionNotes={setFirstSessionNotes}
          onBack={() => setStep(2)}
          onConfirm={handleConfirmLinking}
          isSubmitting={isSubmitting}
          isSendingOtp={isSendingOtp}
        />
      )}

      <DatePickerModal
        visible={showEndDatePicker}
        title="Fecha de fin de suplencia"
        minDate={new Date()}
        onClose={() => setShowEndDatePicker(false)}
        onSelectDate={(formattedDate) => {
          setEndDateSuplencia(formattedDate);
          setShowEndDatePicker(false);
        }}
      />

      <DatePickerModal
        visible={showSessionDatePicker}
        title="Fecha de primera sesión"
        minDate={new Date()}
        onClose={() => setShowSessionDatePicker(false)}
        onSelectDate={(formattedDate) => {
          setFirstSessionDate(formattedDate);
          setShowSessionDatePicker(false);
        }}
      />

      <TimePickerModal
        visible={showSessionTimePicker}
        selectedTime={firstSessionTime}
        selectedDate={firstSessionDate}
        duration={Number(firstSessionDuration) || 60}
        busySessions={busySessions}
        onClose={() => setShowSessionTimePicker(false)}
        onSelectTime={(time) => {
          setFirstSessionTime(time);
          setShowSessionTimePicker(false);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#0F613B',
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#0F613B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#111827',
  },
  otpInput: {
    height: 56,
    borderWidth: 2,
    borderColor: '#0F613B',
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    color: '#0F613B',
  },
  resendText: {
    fontSize: 13,
    color: '#0F613B',
    fontWeight: '600',
  },
  primaryButton: {
    height: 48,
    backgroundColor: '#0F613B',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
    backgroundColor: '#F9FAFB',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  patientInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  patientSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  titularAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginBottom: 10,
  },
  titularAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  titularAlertText: {
    fontSize: 13,
    color: '#1E3A8A',
    marginTop: 2,
  },
  suplenteNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    marginBottom: 10,
    gap: 8,
  },
  suplenteNoticeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  modeCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  modeCardSelected: {
    borderColor: '#0F613B',
    backgroundColor: '#F0FDF4',
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    marginRight: 8,
  },
  radioDotActive: {
    borderColor: '#0F613B',
    backgroundColor: '#0F613B',
  },
  modeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  modeCardDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  dateSelector: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  dateSelectorText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    marginBottom: 16,
  },
  otpBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F613B',
  },
  otpBannerText: {
    fontSize: 13,
    color: '#166534',
    marginTop: 2,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalityToggle: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    padding: 4,
  },
  modalityBtn: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalityBtnActive: {
    backgroundColor: '#0F613B',
  },
  modalityBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  modalityBtnTextActive: {
    color: '#FFFFFF',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  durBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durBtnActive: {
    borderColor: '#0F613B',
    backgroundColor: '#0F613B',
  },
  durBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  durBtnTextActive: {
    color: '#FFFFFF',
  },
});
