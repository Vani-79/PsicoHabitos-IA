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
import {
  Gender,
  PatientRegistrationForm,
  MySqlPatientRecord,
} from '../../types/patient';
import { formatToMySqlDateTime } from '../../utils/date';
import { isValidEmail, validatePatientForm } from '../../utils/validators';

const SESSION_DURATIONS = [
  { key: '30', label: '30 min' },
  { key: '45', label: '45 min' },
  { key: '60', label: '60 min' },
  { key: '75', label: '75 min' },
  { key: '90', label: '90 min' },
];



interface RegisterPatientScreenProps {
  onBack?: () => void;
  onNavigateToLogin?: () => void;
  onRegisterSuccess: (record: MySqlPatientRecord) => Promise<{ success: boolean; error?: string } | void> | void;
}

export const RegisterPatientScreen: React.FC<RegisterPatientScreenProps> = ({
  onBack,
  onNavigateToLogin,
  onRegisterSuccess,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<PatientRegistrationForm>({
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
  });

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

  // Estados para abrir los modales de calendario y hora
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [showSessionDatePicker, setShowSessionDatePicker] = useState(false);
  const [showSessionTimePicker, setShowSessionTimePicker] = useState(false);

  const updateField = (field: keyof PatientRegistrationForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: keyof PatientRegistrationForm) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  // Selección de Fecha de Nacimiento desde el modal de calendario
  const handleSelectBirthDate = (formattedDate: string, dateObj: Date) => {
    const today = new Date();
    let calculatedAge = today.getFullYear() - dateObj.getFullYear();
    const m = today.getMonth() - dateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateObj.getDate())) {
      calculatedAge--;
    }

    setForm((prev) => ({
      ...prev,
      fechaNacimiento: formattedDate,
      edad: calculatedAge >= 0 ? String(calculatedAge) : '',
    }));
  };

  // Selección de Fecha de Primera Sesión desde el modal de calendario
  const handleSelectSessionDate = (formattedDate: string) => {
    setForm((prev) => ({
      ...prev,
      fechaPrimeraSesion: formattedDate,
    }));
  };

  const handleRegister = async () => {
    // 1. Validación exhaustiva de todos los campos mediante utilidades puras
    const validation = validatePatientForm(form);
    if (!validation.isValid) {
      Alert.alert(validation.errorTitle || 'Dato inválido', validation.errorMessage || 'Verifica los datos ingresados.');
      return;
    }

    // 2. Fecha y hora de registro para la columna created_at en MySQL
    const createdAt = formatToMySqlDateTime();

    // Objeto estructurado para MySQL (`pacientes`) sin contraseña
    const mySqlPatientRecord: MySqlPatientRecord = {
      nombre: form.nombre.trim(),
      apellido_paterno: form.apellidoPaterno.trim(),
      apellido_materno: form.apellidoMaterno.trim(),
      edad: Number.parseInt(form.edad, 10) || 0,
      fecha_nacimiento: form.fechaNacimiento,        // Columna DATE en MySQL
      genero: form.genero as Gender,                  // ENUM('masculino','femenino','otro')
      fecha_primera_sesion: form.fechaPrimeraSesion,    // Columna DATE en MySQL
      hora_primera_sesion: form.horaPrimeraSesion || '10:00',
      duracion_primera_sesion: Number(form.duracionPrimeraSesion) || 60,
      modalidad_primera_sesion: form.modalidadPrimeraSesion || 'presencial',
      observaciones_primera_sesion: (form.observacionesPrimeraSesion || '').trim(),
      email: form.email.trim().toLowerCase(),
      created_at: createdAt,                          // DATETIME en MySQL
    };

    setIsSaving(true);
    try {
      const res = (await onRegisterSuccess(mySqlPatientRecord)) as
        | { success: boolean; error?: string }
        | undefined;

      if (res && !res.success) {
        Alert.alert(
          'No se pudo registrar al paciente',
          res.error || 'El correo ingresado ya se encuentra en uso o es inválido.'
        );
      } else {
        Alert.alert(
          '¡Paciente Registrado!',
          `Se ha creado exitosamente la ficha para ${form.nombre.trim()} ${form.apellidoPaterno.trim()}.`
        );
      }
    } catch (err) {
      console.error('Error al registrar paciente:', err);
      Alert.alert('Error', 'Ocurrió un problema de conexión al registrar el paciente.');
    } finally {
      setIsSaving(false);
    }
  };

  const genderOptions: { key: Gender; label: string }[] = [
    { key: 'femenino', label: 'Femenino' },
    { key: 'masculino', label: 'Masculino' },
    { key: 'otro', label: 'Otro' },
  ];

  const isFormValid =
    form.nombre.trim().length > 0 &&
    form.apellidoPaterno.trim().length > 0 &&
    form.apellidoMaterno.trim().length > 0 &&
    form.email.includes('@') &&
    form.fechaNacimiento.length > 0 &&
    form.fechaPrimeraSesion.length > 0;

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
          {/* Encabezado Institucional */}
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

          {/* Tarjeta de Registro del Paciente */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Registrar Nuevo Paciente</Text>
            <Text style={styles.cardSubtitle}>Complete la ficha clínica del paciente</Text>

            {/* Nombre */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Nombre <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                  style={[
                    styles.input,
                    touched.nombre &&
                      !form.nombre.trim() &&
                      styles.inputErrorBorder,
                  ]}
                  placeholder="Ingresa tu nombre"
                  placeholderTextColor="#9CA3AF"
                  value={form.nombre}
                  onChangeText={(text) =>
                    updateField(
                      'nombre',
                      text.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]/g, '')
                    )
                  }
                  onBlur={() => handleBlur('nombre')}
                />

                {touched.nombre && !form.nombre.trim() && (
                  <Text style={styles.fieldErrorText}>
                    Este campo no puede estar vacío.
                  </Text>
                )}
            </View>

            {/* Apellido Paterno */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Apellido Paterno <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                  style={[
                    styles.input,
                    touched.apellidoPaterno &&
                      !form.apellidoPaterno.trim() &&
                      styles.inputErrorBorder,
                  ]}
                  placeholder="Ingresa tu apellido paterno"
                  placeholderTextColor="#9CA3AF"
                  value={form.apellidoPaterno}
                  onChangeText={(text) =>
                    updateField(
                      'apellidoPaterno',
                      text.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]/g, '')
                    )
                  }
                  onBlur={() => handleBlur('apellidoPaterno')}
                />

                {touched.apellidoPaterno && !form.apellidoPaterno.trim() && (
                  <Text style={styles.fieldErrorText}>
                    Este campo no puede estar vacío.
                  </Text>
                )}
            </View>

            {/* Apellido Materno */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Apellido Materno <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                  style={[
                    styles.input,
                    touched.apellidoMaterno &&
                      !form.apellidoMaterno.trim() &&
                      styles.inputErrorBorder,
                  ]}
                  placeholder="Ingresa tu apellido materno"
                  placeholderTextColor="#9CA3AF"
                  value={form.apellidoMaterno}
                  onChangeText={(text) =>
                    updateField(
                      'apellidoMaterno',
                      text.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]/g, '')
                    )
                  }
                  onBlur={() => handleBlur('apellidoMaterno')}
                />

                {touched.apellidoMaterno && !form.apellidoMaterno.trim() && (
                  <Text style={styles.fieldErrorText}>
                    Este campo no puede estar vacío.
                  </Text>
                )}
            </View>

            {/* Selector de Fecha de Nacimiento tipo Calendario */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Fecha de Nacimiento <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={() => setShowBirthDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={20} color="#0F613B" style={styles.dateIcon} />
                <Text
                  style={[
                    styles.datePickerValueText,
                    !form.fechaNacimiento && styles.datePickerPlaceholder,
                  ]}
                >
                  {form.fechaNacimiento || 'Tocar para seleccionar en el calendario'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Fila: Edad (calculada automáticamente o editable) y Género */}
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
                <View style={styles.genderContainer}>
                  {genderOptions.map((item) => {
                    const isSelected = form.genero === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.genderOption,
                          isSelected && styles.genderOptionActive,
                        ]}
                        onPress={() => updateField('genero', item.key)}
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
              </View>
            </View>

            {/* Selector de Fecha de Primera Sesión tipo Calendario */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Fecha de Primera Sesión <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={() => setShowSessionDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={20} color="#0F613B" style={styles.dateIcon} />
                <Text
                  style={[
                    styles.datePickerValueText,
                    !form.fechaPrimeraSesion && styles.datePickerPlaceholder,
                  ]}
                >
                  {form.fechaPrimeraSesion || 'Tocar para seleccionar en el calendario'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Hora de Inicio de Primera Sesión */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hora de Inicio de la Primera Sesión</Text>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={() => setShowSessionTimePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={20} color="#0F613B" style={styles.dateIcon} />
                <Text style={styles.datePickerValueText}>
                  {form.horaPrimeraSesion || '10:00'} hrs
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Duración de Primera Sesión */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duración de la Sesión</Text>
              <View style={styles.chipRow}>
                {SESSION_DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[
                      styles.durationChip,
                      form.duracionPrimeraSesion === d.key && styles.durationChipActive,
                    ]}
                    onPress={() => updateField('duracionPrimeraSesion', d.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        form.duracionPrimeraSesion === d.key && styles.durationChipTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Modalidad de Primera Sesión */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Modalidad de la Sesión</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.durationChip,
                    styles.flexChip,
                    form.modalidadPrimeraSesion === 'presencial' && styles.durationChipActive,
                  ]}
                  onPress={() => updateField('modalidadPrimeraSesion', 'presencial')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={form.modalidadPrimeraSesion === 'presencial' ? '#0F613B' : '#4B5563'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.durationChipText,
                      form.modalidadPrimeraSesion === 'presencial' && styles.durationChipTextActive,
                    ]}
                  >
                    Presencial
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.durationChip,
                    styles.flexChip,
                    form.modalidadPrimeraSesion === 'online' && styles.durationChipActive,
                  ]}
                  onPress={() => updateField('modalidadPrimeraSesion', 'online')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={16}
                    color={form.modalidadPrimeraSesion === 'online' ? '#0F613B' : '#4B5563'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.durationChipText,
                      form.modalidadPrimeraSesion === 'online' && styles.durationChipTextActive,
                    ]}
                  >
                    Online
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Observaciones de Primera Sesión */}
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

            {/* Email del Paciente */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Email del Paciente <Text style={styles.requiredStar}>*</Text>
              </Text>

              <TextInput
                style={[
                  styles.input,
                  touched.email &&
                    (!form.email.trim() || !isValidEmail(form.email)) &&
                    styles.inputErrorBorder,
                ]}
                placeholder="paciente@email.com"
                placeholderTextColor="#9CA3AF"
                value={form.email}
                onChangeText={(text) => updateField('email', text)}
                onBlur={() => handleBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {touched.email && !form.email.trim() && (
                <Text style={styles.fieldErrorText}>
                  Este campo no puede estar vacío.
                </Text>
              )}

              {touched.email &&
                form.email.trim() &&
                !isValidEmail(form.email) && (
                  <Text style={styles.fieldErrorText}>
                    Ingresa un correo electrónico válido.
                  </Text>
                )}
            </View>

            {/* Modal de Calendario para Fecha de Nacimiento */}
            <DatePickerModal
              visible={showBirthDatePicker}
              title="Fecha de Nacimiento"
              initialDate={form.fechaNacimiento || '2000-01-01'}
              maxDate={new Date(2010, 11, 31)}
              onClose={() => setShowBirthDatePicker(false)}
              onSelectDate={handleSelectBirthDate}
            />

            {/* Modal de Calendario para Fecha de Primera Sesión */}
            <DatePickerModal
              visible={showSessionDatePicker}
              title="Fecha de Primera Sesión"
              initialDate={form.fechaPrimeraSesion || new Date().toISOString().split('T')[0]}
              maxDate={new Date()}
              onClose={() => setShowSessionDatePicker(false)}
              onSelectDate={handleSelectSessionDate}
            />

            {/* Modal para Selección de Hora de Primera Sesión */}
            <TimePickerModal
              visible={showSessionTimePicker}
              selectedTime={form.horaPrimeraSesion || '10:00'}
              title="Hora de Inicio de la Primera Sesión"
              onClose={() => setShowSessionTimePicker(false)}
              onSelectTime={(time) => updateField('horaPrimeraSesion', time)}
            />

            {/* Botón Registrar Paciente */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid || isSaving) && styles.submitButtonDisabled,
              ]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={!isFormValid || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Registrar Paciente</Text>
              )}
            </TouchableOpacity>

          </View>
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
