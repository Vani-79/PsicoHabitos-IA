import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
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
import { PSYCHOLOGIST_COLORS } from './psychologistColors';

const REGISTRATION_COLORS = PSYCHOLOGIST_COLORS.registroPaciente;

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
  horaPrimeraSesion: '',
  duracionPrimeraSesion: '',
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
  hora_primera_sesion: form.horaPrimeraSesion || '',
  duracion_primera_sesion: Number(form.duracionPrimeraSesion) || 0,
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
          color={isNuevo ? REGISTRATION_COLORS.fondoBase : REGISTRATION_COLORS.textoSecundario}
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
          color={!isNuevo ? REGISTRATION_COLORS.fondoBase : REGISTRATION_COLORS.textoSecundario}
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
      placeholderTextColor={REGISTRATION_COLORS.textoSecundario}
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
      <Ionicons name={iconName} size={20} color={REGISTRATION_COLORS.iconosPerfil} style={styles.dateIcon} />
      <Text
        style={[
          styles.datePickerValueText,
          isPlaceholder && styles.datePickerPlaceholder,
        ]}
      >
        {valueText}
      </Text>
      <Ionicons name="chevron-down" size={18} color={REGISTRATION_COLORS.iconosPerfil} />
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
            color={isSelected ? REGISTRATION_COLORS.textoBlanco : REGISTRATION_COLORS.textoSecundario}
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
      <Text style={styles.cardTitle}>Formulario de registro</Text>

      <ValidatedTextInput
        label="Nombre"
        placeholder="Ej. 'Carla'"
        value={form.nombre}
        hasError={hasEmptyFieldError(touched.nombre, form.nombre)}
        errorMessage="Este campo no puede estar vacío."
        onChangeText={(text) => updateField('nombre', cleanAlphaText(text))}
        onBlur={() => handleBlur('nombre')}
      />

      <ValidatedTextInput
        label="Apellido Paterno"
        placeholder="Ej. 'Gómez'"
        value={form.apellidoPaterno}
        hasError={hasEmptyFieldError(touched.apellidoPaterno, form.apellidoPaterno)}
        errorMessage="Este campo no puede estar vacío."
        onChangeText={(text) => updateField('apellidoPaterno', cleanAlphaText(text))}
        onBlur={() => handleBlur('apellidoPaterno')}
      />

      <ValidatedTextInput
        label="Apellido Materno"
        placeholder="Ej. 'Pérez'"
        value={form.apellidoMaterno}
        hasError={hasEmptyFieldError(touched.apellidoMaterno, form.apellidoMaterno)}
        errorMessage="Este campo no puede estar vacío."
        onChangeText={(text) => updateField('apellidoMaterno', cleanAlphaText(text))}
        onBlur={() => handleBlur('apellidoMaterno')}
      />

      <PickerTriggerField
        label="Fecha de nacimiento"
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
            placeholderTextColor={REGISTRATION_COLORS.textoSecundario}
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
        label="Fecha sesión"
        required
        valueText={sessionDateLabel}
        isPlaceholder={!form.fechaPrimeraSesion}
        iconName="calendar-outline"
        onPress={() => setShowSessionDatePicker(true)}
      />

      <PickerTriggerField
        label="Hora sesión"
        required
        valueText={sessionTimeLabel}
        isPlaceholder={!form.horaPrimeraSesion}
        iconName="time-outline"
        onPress={handleOpenSessionTimePicker}
      />

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Duración</Text>
        <DurationChips
          selectedDuration={form.duracionPrimeraSesion}
          onSelectDuration={(dur) => updateField('duracionPrimeraSesion', dur)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Modalidad</Text>
        <ModalityChips
          selectedModality={form.modalidadPrimeraSesion}
          onSelectModality={(mod) => updateField('modalidadPrimeraSesion', mod)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Observaciones</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Observaciones iniciales, motivo de consulta, etc."
          placeholderTextColor={REGISTRATION_COLORS.textoSecundario}
          value={form.observacionesPrimeraSesion}
          onChangeText={(text) => updateField('observacionesPrimeraSesion', text)}
          multiline
          numberOfLines={3}
        />
      </View>

      <ValidatedTextInput
        label="Correo electrónico"
        placeholder="Paciente@email.com"
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
        title="Fecha de nacimiento"
        initialDate={form.fechaNacimiento || '2000-01-01'}
        maxDate={new Date(2010, 11, 31)}
        onClose={() => setShowBirthDatePicker(false)}
        onSelectDate={handleSelectBirthDate}
      />

      <DatePickerModal
        visible={showSessionDatePicker}
        title="Fecha de sesión"
        initialDate={form.fechaPrimeraSesion || new Date().toISOString().split('T')[0]}
        maxDate={new Date()}
        onClose={() => setShowSessionDatePicker(false)}
        onSelectDate={handleSelectSessionDate}
      />

      <TimePickerModal
        visible={showSessionTimePicker}
        selectedTime={form.horaPrimeraSesion || ''}
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
          <ActivityIndicator color={REGISTRATION_COLORS.textoBlanco} />
        ) : (
          <Text
            style={[
              styles.submitButtonText,
              isSubmitDisabled && styles.submitButtonTextDisabled,
            ]}
          >
            Registrar
          </Text>
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



// ESTILOS DE FORMULARIO REGISTRO
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: REGISTRATION_COLORS.fondoBase,
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  card: {
    marginTop: 20,
    backgroundColor: REGISTRATION_COLORS.fondoBase,
    borderRadius: 20,
    padding: 22,
    elevation: 1,
    borderWidth: 1,
    borderColor: REGISTRATION_COLORS.bordeIconos,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: REGISTRATION_COLORS.textoPrincipal,
    textAlign: 'center',
    marginBottom: 30,
  },

  segmentContainer: {
    marginVertical: 20,
    flexDirection: 'row',
    backgroundColor: REGISTRATION_COLORS.fondoiconos,
    borderRadius: 12,
    padding: 4,
    marginBottom: 1,
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
    backgroundColor: REGISTRATION_COLORS.iconosPerfil,
  },

  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: REGISTRATION_COLORS.textoSecundario,
  },

  segmentBtnTextActive: {
    color: REGISTRATION_COLORS.textoBlanco,
    fontWeight: '600',
  },

  inputGroup: {
    marginBottom: 15,
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: REGISTRATION_COLORS.textoSecundario,
    marginBottom: 5,
  },

  requiredStar: {
    color: REGISTRATION_COLORS.dangerBright,
  },

  input: {
    backgroundColor: REGISTRATION_COLORS.fondoiconos,
    borderWidth: 1,
    borderColor: REGISTRATION_COLORS.bordeIconos,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 12,
    color: REGISTRATION_COLORS.textoPrincipal,
  },

  inputErrorBorder: {
    borderColor: REGISTRATION_COLORS.danger,
    borderWidth: 2,
  },

  fieldErrorText: {
    color: REGISTRATION_COLORS.danger,
    fontSize: 12,
    marginTop: 9,
  },

  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: REGISTRATION_COLORS.fondoiconos,
    borderWidth: 1,
    borderColor: REGISTRATION_COLORS.bordeIconos,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },

  dateIcon: {
    marginRight: 5,
  },

  datePickerValueText: {
    flex: 1,
    fontSize: 13,
    color: REGISTRATION_COLORS.textoPrincipal,
    fontWeight: '600',
  },

  datePickerPlaceholder: {
    color: REGISTRATION_COLORS.textoSecundario,
    fontWeight: '400',
  },

  genderContainer: {
    flexDirection: 'row',
    backgroundColor: REGISTRATION_COLORS.fondoiconos,
    borderColor: REGISTRATION_COLORS.bordeIconos,
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
  },

  genderOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: REGISTRATION_COLORS.fondoBase,
    borderColor: REGISTRATION_COLORS.bordeIconos,
    borderWidth: 1,
  },

  genderOptionActive: {
    backgroundColor: REGISTRATION_COLORS.iconosPerfil,
    elevation: 2,
  },

  genderOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: REGISTRATION_COLORS.textoSecundario,
  },

  genderOptionTextActive: {
    color: REGISTRATION_COLORS.textoBlanco,
  },

  // Botón registrar paciente
  submitButton: {
    backgroundColor: REGISTRATION_COLORS.iconosPerfil,
    borderColor: REGISTRATION_COLORS.bordeIconos,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    width: '50%',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 30,
    marginBottom: 50,
    elevation: 2,
  },

  submitButtonDisabled: {
    backgroundColor: REGISTRATION_COLORS.fondoiconos,
    elevation: 0,
  },

  submitButtonText: {
    color: REGISTRATION_COLORS.textoBlanco,
    fontSize: 14,
    fontWeight: '600',
  },

  submitButtonTextDisabled: {
    color: REGISTRATION_COLORS.textoSecundario,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },

  durationChip: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: REGISTRATION_COLORS.fondoiconos,
    borderWidth: 1,
    borderColor: REGISTRATION_COLORS.bordeIconos,
    justifyContent: 'center',
    flexDirection: 'row',
  },

  durationChipActive: {
    backgroundColor: REGISTRATION_COLORS.iconosPerfil,
    borderColor: REGISTRATION_COLORS.fondoBase,
  },

  durationChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: REGISTRATION_COLORS.textoSecundario,
  },

  durationChipTextActive: {
    color: REGISTRATION_COLORS.textoBlanco,
    fontWeight: '600',
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