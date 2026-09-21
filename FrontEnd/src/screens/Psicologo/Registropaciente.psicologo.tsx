import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerModal } from '../../components/DatePickerModal';
import {
  Gender,
  PatientRegistrationForm,
  MySqlPatientRecord,
} from '../../types/patient';
import { formatToMySqlDateTime } from '../../utils/date';
import { validatePatientForm } from '../../utils/validators';

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
  const [form, setForm] = useState<PatientRegistrationForm>({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    edad: '',
    fechaNacimiento: '',
    genero: '',
    fechaPrimeraSesion: '',
    email: '',
  });

  // Estados para abrir los modales de calendario
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [showSessionDatePicker, setShowSessionDatePicker] = useState(false);

  const updateField = (field: keyof PatientRegistrationForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
                style={styles.input}
                placeholder="Ej. Valentina"
                placeholderTextColor="#9CA3AF"
                value={form.nombre}
                onChangeText={(text) => updateField('nombre', text)}
              />
            </View>

            {/* Apellido Paterno */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Apellido Paterno <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Pérez"
                placeholderTextColor="#9CA3AF"
                value={form.apellidoPaterno}
                onChangeText={(text) => updateField('apellidoPaterno', text)}
              />
            </View>

            {/* Apellido Materno */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Apellido Materno <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. González"
                placeholderTextColor="#9CA3AF"
                value={form.apellidoMaterno}
                onChangeText={(text) => updateField('apellidoMaterno', text)}
              />
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
                  placeholder="Ej. 26"
                  placeholderTextColor="#9CA3AF"
                  value={form.edad}
                  onChangeText={(text) => updateField('edad', text)}
                  keyboardType="numeric"
                  maxLength={3}
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

            {/* Email del Paciente */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Email del Paciente <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  form.email.length > 0 && !form.email.includes('@') && styles.inputErrorBorder,
                ]}
                placeholder="paciente@email.com"
                placeholderTextColor="#9CA3AF"
                value={form.email}
                onChangeText={(text) => updateField('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {form.email.length > 0 && !form.email.includes('@') && (
                <Text style={styles.fieldErrorText}>El correo debe contener un '@'</Text>
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
    backgroundColor: '#F8FAF9',
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
    borderColor: '#EF4444',
  },
  fieldErrorText: {
    fontSize: 11.5,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
    fontWeight: '500',
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
});
