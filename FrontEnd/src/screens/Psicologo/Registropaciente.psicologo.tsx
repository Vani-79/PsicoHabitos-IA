import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerModal } from '../../components/DatePickerModal';
import { TimePickerModal } from '../../components/TimePickerModal';
import { appointmentService } from '../../services/appointmentService';
import {
  Gender,
  PatientRegistrationForm,
  MySqlPatientRecord,
} from '../../types/patient';
import { VincularPacienteTab } from './components/VincularPacienteTab';
import { formatToMySqlDateTime, formatToChileanDate } from '../../utils/date';
import { isValidEmail, validatePatientForm } from '../../utils/validators';

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



const GENDER_OPTIONS: { key: Gender; label: string }[] = [
  { key: 'femenino', label: 'Femenino' },
  { key: 'masculino', label: 'Masculino' },
  { key: 'otro', label: 'Otro' },
];

const SESSION_MODALITIES: {
  key: 'presencial' | 'online';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'presencial', label: 'Presencial', icon: 'business-outline' },
  { key: 'online', label: 'Online', icon: 'videocam-outline' },
];

const INITIAL_FORM: PatientRegistrationForm = {
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  edad: '',
  fechaNacimiento: '',
  genero: '',
  fechaPrimeraSesion: '',
  horaPrimeraSesion: '10:00',
  duracionPrimeraSesion: '60',
  modalidadPrimeraSesion: 'presencial',
  observacionesPrimeraSesion: '',
  email: '',
};

const cleanAlphaText = (text: string) =>
  text.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]/g, '');

const calculateAge = (dateObj: Date): string => {
  const today = new Date();
  let calculatedAge = today.getFullYear() - dateObj.getFullYear();
  const m = today.getMonth() - dateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateObj.getDate())) {
    calculatedAge--;
  }
  return calculatedAge >= 0 ? String(calculatedAge) : '';
};

const checkIsFormValid = (form: PatientRegistrationForm): boolean => {
  const hasNombre = Boolean(form.nombre.trim());
  const hasApellidoP = Boolean(form.apellidoPaterno.trim());
  const hasApellidoM = Boolean(form.apellidoMaterno.trim());
  const hasEmail = form.email.includes('@');
  const hasBirth = Boolean(form.fechaNacimiento);
  const hasSession = Boolean(form.fechaPrimeraSesion);
  return hasNombre && hasApellidoP && hasApellidoM && hasEmail && hasBirth && hasSession;
};

const getEmailError = (isTouched?: boolean, email?: string): string | null => {
  if (!isTouched) return null;
  const trimmed = email ? email.trim() : '';
  if (!trimmed) return 'Este campo no puede estar vacío.';
  if (!isValidEmail(trimmed)) return 'Ingresa un correo electrónico válido.';
  return null;
};

const hasEmptyFieldError = (isTouched?: boolean, value?: string): boolean => {
  return Boolean(isTouched && !value?.trim());
};

const isSessionTimeInPast = (selectedDate?: string, selectedTime?: string): boolean => {
  if (!selectedDate || !selectedTime) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (selectedDate !== todayStr) return false;
  const startMinutes = timeToMinutes(selectedTime);
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  return startMinutes <= nowMinutes + 30;
};

const hasScheduleConflict = (
  selectedTime?: string,
  durationStr?: string,
  busySessions: { hora: string; duracion: number }[] = []
): boolean => {
  if (!selectedTime) return false;
  const startMinutes = timeToMinutes(selectedTime);
  const durMinutes = Number(durationStr) || 60;
  return busySessions.some((b) =>
    rangesOverlap(startMinutes, durMinutes, timeToMinutes(b.hora), b.duracion)
  );
};

const fetchBusySessions = async (dateStr: string): Promise<{ hora: string; duracion: number }[]> => {
  if (!dateStr) return [];
  try {
    const dayAppointments = await appointmentService.getPsychologistCalendar({
      date: dateStr,
    });
    return dayAppointments
      .filter((a) => a.estado !== 'Cancelada')
      .map((a) => ({ hora: a.hora, duracion: Number(a.duracion) || 60 }));
  } catch (err) {
    console.warn('[Registropaciente] Error al cargar horarios ocupados:', err);
    return [];
  }
};

const buildPatientRecord = (form: PatientRegistrationForm): MySqlPatientRecord => ({
  nombre: form.nombre.trim(),
  apellido_paterno: form.apellidoPaterno.trim(),
  apellido_materno: form.apellidoMaterno.trim(),
  edad: Number.parseInt(form.edad, 10) || 0,
  fecha_nacimiento: form.fechaNacimiento,
  genero: form.genero as Gender,
  fecha_primera_sesion: form.fechaPrimeraSesion,
  hora_primera_sesion: form.horaPrimeraSesion || '10:00',
  duracion_primera_sesion: Number(form.duracionPrimeraSesion) || 60,
  modalidad_primera_sesion: form.modalidadPrimeraSesion || 'presencial',
  observaciones_primera_sesion: (form.observacionesPrimeraSesion || '').trim(),
  email: form.email.trim().toLowerCase(),
  created_at: formatToMySqlDateTime(),
});

const notifyRegisterResult = (
  res: { success: boolean; error?: string } | void | undefined,
  fullName: string
) => {
  if (res && !res.success) {
    Alert.alert(
      'No se pudo registrar al paciente',
      res.error || 'El correo ingresado ya se encuentra en uso o es inválido.'
    );
    return;
  }
  Alert.alert(
    '¡Paciente Registrado!',
    `Se ha creado exitosamente la ficha para ${fullName}.`
  );
};

// =================== SUBCOMPONENTES PRESENTACIONALES ===================

const InstitutionalHeader: React.FC = () => (
  <View style={styles.header}>
    <Image
      source={require('../../../assets/logo.png')}
      style={styles.logoImage}
      resizeMode="contain"
    />
    <Text style={styles.brandTitle}>
      <Text style={styles.titlePsico}>Psico</Text>
      <Text style={styles.titleHabitos}>Hábitos-IA</Text>
    </Text>
    <Text style={styles.sloganText}>Tu bienestar, un día a la vez.</Text>
  </View>
);

interface RegistrationModeSelectorProps {
  mode: 'nuevo' | 'existente';
  onSelectMode: (mode: 'nuevo' | 'existente') => void;
}

const RegistrationModeSelector: React.FC<RegistrationModeSelectorProps> = ({
  mode,
  onSelectMode,
}) => {
  const isNuevo = mode === 'nuevo';
  return (
    <View style={styles.segmentContainer}>
      <TouchableOpacity
        style={[styles.segmentBtn, isNuevo && styles.segmentBtnActive]}
        onPress={() => onSelectMode('nuevo')}
      >
        <Ionicons
          name="person-add"
          size={16}
          color={isNuevo ? '#FFFFFF' : '#4B5563'}
        />
        <Text
          style={[
            styles.segmentBtnText,
            isNuevo && styles.segmentBtnTextActive,
          ]}
        >
          Paciente nuevo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segmentBtn, !isNuevo && styles.segmentBtnActive]}
        onPress={() => onSelectMode('existente')}
      >
        <Ionicons
          name="link"
          size={16}
          color={!isNuevo ? '#FFFFFF' : '#4B5563'}
        />
        <Text
          style={[
            styles.segmentBtnText,
            !isNuevo && styles.segmentBtnTextActive,
          ]}
        >
          Paciente ya registrado
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface ValidatedTextInputProps {
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  hasError: boolean;
  errorMessage?: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
}

const ValidatedTextInput: React.FC<ValidatedTextInputProps> = ({
  label,
  required = true,
  value,
  placeholder,
  hasError,
  errorMessage,
  onChangeText,
  onBlur,
  keyboardType = 'default',
  autoCapitalize = 'words',
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>
      {label} {required && <Text style={styles.requiredStar}>*</Text>}
    </Text>
    <TextInput
      style={[styles.input, hasError && styles.inputErrorBorder]}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
    {hasError && errorMessage ? (
      <Text style={styles.fieldErrorText}>{errorMessage}</Text>
    ) : null}
  </View>
);

interface PickerTriggerFieldProps {
  label: string;
  required?: boolean;
  valueText: string;
  isPlaceholder: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

const PickerTriggerField: React.FC<PickerTriggerFieldProps> = ({
  label,
  required = false,
  valueText,
  isPlaceholder,
  iconName,
  onPress,
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>
      {label} {required && <Text style={styles.requiredStar}>*</Text>}
    </Text>
    <TouchableOpacity
      style={styles.datePickerTrigger}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={iconName} size={20} color="#0F613B" style={styles.dateIcon} />
      <Text
        style={[
          styles.datePickerValueText,
          isPlaceholder && styles.datePickerPlaceholder,
        ]}
      >
        {valueText}
      </Text>
      <Ionicons name="chevron-down" size={18} color="#6B7280" />
    </TouchableOpacity>
  </View>
);

interface GenderSelectorProps {
  selectedGender: string;
  onSelectGender: (gender: Gender) => void;
}

const GenderSelector: React.FC<GenderSelectorProps> = ({
  selectedGender,
  onSelectGender,
}) => (
  <View style={styles.genderContainer}>
    {GENDER_OPTIONS.map((item) => {
      const isSelected = selectedGender === item.key;
      return (
        <TouchableOpacity
          key={item.key}
          style={[styles.genderOption, isSelected && styles.genderOptionActive]}
          onPress={() => onSelectGender(item.key)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.genderOptionText,
              isSelected && styles.genderOptionTextActive,
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

interface DurationChipsProps {
  selectedDuration?: string;
  onSelectDuration: (dur: string) => void;
}

const DurationChips: React.FC<DurationChipsProps> = ({
  selectedDuration,
  onSelectDuration,
}) => (
  <View style={styles.chipRow}>
    {SESSION_DURATIONS.map((d) => {
      const isSelected = selectedDuration === d.key;
      return (
        <TouchableOpacity
          key={d.key}
          style={[styles.durationChip, isSelected && styles.durationChipActive]}
          onPress={() => onSelectDuration(d.key)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.durationChipText,
              isSelected && styles.durationChipTextActive,
            ]}
          >
            {d.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

interface ModalityChipsProps {
  selectedModality?: string;
  onSelectModality: (mod: 'presencial' | 'online') => void;
}

const ModalityChips: React.FC<ModalityChipsProps> = ({
  selectedModality,
  onSelectModality,
}) => (
  <View style={styles.chipRow}>
    {SESSION_MODALITIES.map((item) => {
      const isSelected = selectedModality === item.key;
      return (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.durationChip,
            styles.flexChip,
            isSelected && styles.durationChipActive,
          ]}
          onPress={() => onSelectModality(item.key)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={item.icon}
            size={16}
            color={isSelected ? '#0F613B' : '#4B5563'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.durationChipText,
              isSelected && styles.durationChipTextActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// =================== CUSTOM HOOK DE GESTIÓN DEL FORMULARIO ===================

const useNuevoPaciente = (
  onRegisterSuccess: (record: MySqlPatientRecord) => Promise<{ success: boolean; error?: string } | void> | void
) => {
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<PatientRegistrationForm>(INITIAL_FORM);

  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [showSessionDatePicker, setShowSessionDatePicker] = useState(false);
  const [showSessionTimePicker, setShowSessionTimePicker] = useState(false);
  const [busySessions, setBusySessions] = useState<{ hora: string; duracion: number }[]>([]);

  useEffect(() => {
    let isMounted = true;
    void fetchBusySessions(form.fechaPrimeraSesion).then((busy) => {
      if (isMounted) setBusySessions(busy);
    });

    return () => {
      isMounted = false;
    };
  }, [form.fechaPrimeraSesion]);

  const updateField = (field: keyof PatientRegistrationForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!form.horaPrimeraSesion || !form.fechaPrimeraSesion) return;

    const hasConflict = hasScheduleConflict(
      form.horaPrimeraSesion,
      form.duracionPrimeraSesion,
      busySessions
    );

    if (hasConflict) {
      updateField('horaPrimeraSesion', '');
      Alert.alert(
        'Hora no disponible',
        'La hora seleccionada se cruza con otra sesión agendada para esta fecha/duración. Por favor, selecciona una nueva hora.'
      );
    }
  }, [busySessions, form.duracionPrimeraSesion]);

  const handleBlur = (field: keyof PatientRegistrationForm) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleOpenSessionTimePicker = () => {
    if (!form.fechaPrimeraSesion) {
      Alert.alert('Selecciona primero la fecha', 'Elige la fecha de la primera sesión antes de escoger la hora.');
      return;
    }
    setShowSessionTimePicker(true);
  };

  const handleSelectBirthDate = (formattedDate: string, dateObj: Date) => {
    setForm((prev) => ({
      ...prev,
      fechaNacimiento: formattedDate,
      edad: calculateAge(dateObj),
    }));
  };

  const handleSelectSessionDate = (formattedDate: string) => {
    setForm((prev) => ({
      ...prev,
      fechaPrimeraSesion: formattedDate,
    }));
  };

  const handleRegister = async () => {
    const validation = validatePatientForm(form);
    if (!validation.isValid) {
      Alert.alert(
        validation.errorTitle || 'Dato inválido',
        validation.errorMessage || 'Verifica los datos ingresados.'
      );
      return;
    }

    if (hasScheduleConflict(form.horaPrimeraSesion, form.duracionPrimeraSesion, busySessions)) {
      Alert.alert(
        'Horario ocupado',
        'Ya existe una sesión que se cruza con este horario y duración. Elige otra hora.'
      );
      return;
    }

    const mySqlPatientRecord = buildPatientRecord(form);

    setIsSaving(true);
    try {
      const res = await onRegisterSuccess(mySqlPatientRecord);
      notifyRegisterResult(
        res as { success: boolean; error?: string } | void | undefined,
        `${form.nombre.trim()} ${form.apellidoPaterno.trim()}`
      );
    } catch (err) {
      console.error('Error al registrar paciente:', err);
      Alert.alert('Error', 'Ocurrió un problema de conexión al registrar el paciente.');
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = checkIsFormValid(form);
  const emailError = getEmailError(touched.email, form.email);

  return {
    form,
    touched,
    isSaving,
    isFormValid,
    emailError,
    showBirthDatePicker,
    setShowBirthDatePicker,
    showSessionDatePicker,
    setShowSessionDatePicker,
    showSessionTimePicker,
    setShowSessionTimePicker,
    busySessions,
    updateField,
    handleBlur,
    handleOpenSessionTimePicker,
    handleSelectBirthDate,
    handleSelectSessionDate,
    handleRegister,
  };
};

// =================== FORMULARIO DE NUEVO PACIENTE ===================

interface NuevoPacienteFormProps {
  onRegisterSuccess: (record: MySqlPatientRecord) => Promise<{ success: boolean; error?: string } | void> | void;
}

const NuevoPacienteForm: React.FC<NuevoPacienteFormProps> = ({
  onRegisterSuccess,
}) => {
  const {
    form,
    touched,
    isSaving,
    isFormValid,
    emailError,
    showBirthDatePicker,
    setShowBirthDatePicker,
    showSessionDatePicker,
    setShowSessionDatePicker,
    showSessionTimePicker,
    setShowSessionTimePicker,
    busySessions,
    updateField,
    handleBlur,
    handleOpenSessionTimePicker,
    handleSelectBirthDate,
    handleSelectSessionDate,
    handleRegister,
  } = useNuevoPaciente(onRegisterSuccess);

  const birthDateLabel = form.fechaNacimiento
    ? formatToChileanDate(form.fechaNacimiento)
    : 'Tocar para seleccionar en el calendario';

  const sessionDateLabel = form.fechaPrimeraSesion
    ? formatToChileanDate(form.fechaPrimeraSesion)
    : 'Tocar para seleccionar en el calendario';

  const sessionTimeLabel = form.horaPrimeraSesion
    ? `${form.horaPrimeraSesion} hrs`
    : 'Tocar para seleccionar hora';

  const isSubmitDisabled = !isFormValid || isSaving;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Registrar Nuevo Paciente</Text>
      <Text style={styles.cardSubtitle}>Complete la ficha clínica del paciente</Text>

      <ValidatedTextInput
        label="Nombre"
        placeholder="Ingresa tu nombre"
        value={form.nombre}
        hasError={hasEmptyFieldError(touched.nombre, form.nombre)}
        errorMessage="Este campo no puede estar vacío."
        onChangeText={(text) => updateField('nombre', cleanAlphaText(text))}
        onBlur={() => handleBlur('nombre')}
      />

      <ValidatedTextInput
        label="Apellido Paterno"
        placeholder="Ingresa tu apellido paterno"
        value={form.apellidoPaterno}
        hasError={hasEmptyFieldError(touched.apellidoPaterno, form.apellidoPaterno)}
        errorMessage="Este campo no puede estar vacío."
        onChangeText={(text) => updateField('apellidoPaterno', cleanAlphaText(text))}
        onBlur={() => handleBlur('apellidoPaterno')}
      />

      <ValidatedTextInput
        label="Apellido Materno"
        placeholder="Ingresa tu apellido materno"
        value={form.apellidoMaterno}
        hasError={hasEmptyFieldError(touched.apellidoMaterno, form.apellidoMaterno)}
        errorMessage="Este campo no puede estar vacío."
        onChangeText={(text) => updateField('apellidoMaterno', cleanAlphaText(text))}
        onBlur={() => handleBlur('apellidoMaterno')}
      />

      <PickerTriggerField
        label="Fecha de Nacimiento"
        required
        valueText={birthDateLabel}
        isPlaceholder={!form.fechaNacimiento}
        iconName="calendar"
        onPress={() => setShowBirthDatePicker(true)}
      />

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
          <Text style={styles.inputLabel}>Edad</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#9CA3AF"
            value={form.edad}
            editable={false}
          />
        </View>

        <View style={[styles.inputGroup, { flex: 2 }]}>
          <Text style={styles.inputLabel}>
            Género <Text style={styles.requiredStar}>*</Text>
          </Text>
          <GenderSelector
            selectedGender={form.genero}
            onSelectGender={(gender) => updateField('genero', gender)}
          />
        </View>
      </View>

      <PickerTriggerField
        label="Fecha de Primera Sesión"
        required
        valueText={sessionDateLabel}
        isPlaceholder={!form.fechaPrimeraSesion}
        iconName="calendar-outline"
        onPress={() => setShowSessionDatePicker(true)}
      />

      <PickerTriggerField
        label="Hora de Inicio de la Primera Sesión"
        valueText={sessionTimeLabel}
        isPlaceholder={!form.horaPrimeraSesion}
        iconName="time-outline"
        onPress={handleOpenSessionTimePicker}
      />

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Duración de la Sesión</Text>
        <DurationChips
          selectedDuration={form.duracionPrimeraSesion}
          onSelectDuration={(dur) => updateField('duracionPrimeraSesion', dur)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Modalidad de la Sesión</Text>
        <ModalityChips
          selectedModality={form.modalidadPrimeraSesion}
          onSelectModality={(mod) => updateField('modalidadPrimeraSesion', mod)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Observaciones de la Sesión</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Observaciones iniciales, motivo de consulta, etc."
          placeholderTextColor="#9CA3AF"
          value={form.observacionesPrimeraSesion}
          onChangeText={(text) => updateField('observacionesPrimeraSesion', text)}
          multiline
          numberOfLines={3}
        />
      </View>

      <ValidatedTextInput
        label="Email del Paciente"
        placeholder="paciente@email.com"
        value={form.email}
        hasError={Boolean(emailError)}
        errorMessage={emailError ?? undefined}
        onChangeText={(text) => updateField('email', text)}
        onBlur={() => handleBlur('email')}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <DatePickerModal
        visible={showBirthDatePicker}
        title="Fecha de Nacimiento"
        initialDate={form.fechaNacimiento || '2000-01-01'}
        maxDate={new Date(2010, 11, 31)}
        onClose={() => setShowBirthDatePicker(false)}
        onSelectDate={handleSelectBirthDate}
      />

      <DatePickerModal
        visible={showSessionDatePicker}
        title="Fecha de Primera Sesión"
        initialDate={form.fechaPrimeraSesion || new Date().toISOString().split('T')[0]}
        maxDate={new Date()}
        onClose={() => setShowSessionDatePicker(false)}
        onSelectDate={handleSelectSessionDate}
      />

      <TimePickerModal
        visible={showSessionTimePicker}
        selectedTime={form.horaPrimeraSesion || '10:00'}
        selectedDate={form.fechaPrimeraSesion}
        allowPastTimes={true}
        busySessions={busySessions}
        duration={Number(form.duracionPrimeraSesion) || 60}
        title="Hora de Inicio de la Primera Sesión"
        onClose={() => setShowSessionTimePicker(false)}
        onSelectTime={(time) => updateField('horaPrimeraSesion', time)}
      />

      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitDisabled && styles.submitButtonDisabled,
        ]}
        onPress={handleRegister}
        activeOpacity={0.85}
        disabled={isSubmitDisabled}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Registrar Paciente</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

// =================== PANTALLA PRINCIPAL ===================

interface RegisterPatientScreenProps {
  onBack?: () => void;
  onNavigateToLogin?: () => void;
  onRegisterSuccess: (record: MySqlPatientRecord) => Promise<{ success: boolean; error?: string } | void> | void;
}

export const RegisterPatientScreen: React.FC<RegisterPatientScreenProps> = ({
  onBack,
  onNavigateToLogin: _onNavigateToLogin,
  onRegisterSuccess,
}) => {
  const [registrationMode, setRegistrationMode] = useState<'nuevo' | 'existente'>('nuevo');

  useEffect(() => {
    const onBackPress = () => {
      Alert.alert(
        '¿Salir del registro?',
        'Si sales ahora, perderás los datos ingresados y el paciente no será registrado.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: () => {
              onBack?.();
            },
          },
        ]
      );

      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => subscription.remove();
  }, [onBack]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="height"
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <InstitutionalHeader />

          <RegistrationModeSelector
            mode={registrationMode}
            onSelectMode={setRegistrationMode}
          />

          {registrationMode === 'existente' ? (
            <VincularPacienteTab
              onLinkSuccess={(record) => {
                void onRegisterSuccess(record);
              }}
            />
          ) : (
            <NuevoPacienteForm onRegisterSuccess={onRegisterSuccess} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  titlePsico: {
    color: '#0E5C3A',
  },
  titleHabitos: {
    color: '#268D77',
  },
  sloganText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0E5C3A',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#0F613B',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  inputErrorBorder: {
    borderColor: '#DC2626',
    borderWidth: 1,
  },

  fieldErrorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 5,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateIcon: {
    marginRight: 10,
  },
  datePickerValueText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  datePickerPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  genderContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  genderOptionActive: {
    backgroundColor: '#0F613B',
    shadowColor: '#0F613B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  genderOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  genderOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#0F613B',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#0F613B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5C1B3',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  durationChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  durationChipActive: {
    backgroundColor: '#EAF5EE',
    borderColor: '#0F613B',
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  durationChipTextActive: {
    color: '#0F613B',
    fontWeight: '700',
  },
  flexChip: {
    flex: 1,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
});
