import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Image,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HabitKey, DailyHabitRatings, MySqlDailyHabitRecord } from '../../types/habits';
import {
  HABIT_CATALOG,
  HABIT_KEYS,
  RATING_SCALE,
  INITIAL_HABITS_STATE,
  getRatingLabel,
} from '../../constants/habits';
import { PatientBottomNav, PatientTab } from '../../components/Iconosbarrapaciente';
import { formatToChileanDate, formatToMySqlDate, formatToMySqlDateTime, } from '../../utils/date';
import { habitService } from '../../services';
import { s, vs, ms } from '../../utils/responsive';

interface DailyCheckInScreenProps {
  onSaveRecord?: (record: MySqlDailyHabitRecord) => void;
  userName?: string;
  userEmail?: string;
  onNavigateTab?: (tab: PatientTab) => void;
}

// Paleta de la pantalla, agrupada por propósito para mantener sus tonos consistentes.
const COLORS = {
  // Marca y superficies
  primary: '#0F613B',
  screenBackground: '#EAF5EE',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',

  // Texto
  textHeading: '#4d5566',
  textQuestion: '#4d5566',
  textPrimary: '#4d5566',
  textSecondary: '#6B7280',
  textSubdued: '#475569',
  textMuted: '#64748B',
  textDisabled: '#9ca3af',

  // Bordes y separadores
  border: '#E9EEF0',
  borderSoft: '#D9ECDC',
  disabledBorder: '#E1E5E9',
  slateBorder: '#CBD5E1',

  // Estados y acciones
  greenPrimary: '#0F613B',
  greenAction: '#347e5b9e', // Boton guardar en habitos 
  greenSuccess: '#67bd8e',
  greenSoft: '#e2f5e498',
  greenBorder: '#87989660', //Borde imagen en guardar habitos
  greenBadge: '#D1FAE5',
  greenOutline: '#A7F3D0',
  disabledBackground: '#e1eee6', //fondo boton registrar
  registerButton: '#347e5be7', //registrar habitos boton 

  // Colores de las tarjetas por hábito
  habitComidaBackground: '#fff1d8',
  habitEjercicioBackground: '#E7F8E5',
  habitHidratacionBackground: '#DFF7FF',
  habitAnsiedadBackground: '#FDE2E4',
  habitSuenoBackground: '#F0E7FF',
  habitEstresBackground: '#E3F0FF',

  // Controles de hidratación
  blueSoft: '#ffffff',
  blueBorder: '#3e445248',
  blueInputBorder: '#3e445248',
  blueText: '#6B7280',
  waterAction: '#3e4452',
  waterUnit: '#6B7280',

  // Escala y modal
  ratingLabel: '#9ca3af',
  ratingLabelActive: '#334155',
  
  sleepControlBackground: '#F1F5F9',
  sleepUnit: '#64748B',
  dividerSoft: '#F1F5F9',
  closeIcon: '#888',
  overlay: 'rgba(0, 0, 0, 0.45)',
  white: '#FFFFFF',
} as const;

// Vincula cada hábito con los tonos definidos en la paleta.
const HABIT_CARD_COLORS: Record<HabitKey, string> = {
  comida: COLORS.habitComidaBackground,
  ejercicio: COLORS.habitEjercicioBackground,
  hidratacion: COLORS.habitHidratacionBackground,
  ansiedad: COLORS.habitAnsiedadBackground,
  sueno: COLORS.habitSuenoBackground,
  estres: COLORS.habitEstresBackground,
};

export const DailyCheckInScreen: React.FC<DailyCheckInScreenProps> = ({
  onSaveRecord,
  userName = 'Carlos',
  userEmail,
  onNavigateTab,
}) => {
  const insets = useSafeAreaInsets();

  // Fecha estipulada en formato estándar MySQL 'YYYY-MM-DD'
  const recordDate = useMemo(() => formatToMySqlDate(), []);

  const [habits, setHabits] = useState<DailyHabitRatings>(INITIAL_HABITS_STATE);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeHabit, setActiveHabit] = useState<HabitKey | null>(null);
  const [rating, setRating] = useState<number | null>(null);

  // Estados de control robusto con la fecha del servidor (MySQL CURDATE())
  const [isLockedToday, setIsLockedToday] = useState(false);
  const [serverDate, setServerDate] = useState('');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Estados dedicados para la ingesta de agua (litros)
  const [waterLiters, setWaterLiters] = useState<number>(2.0);
  const [waterInputText, setWaterInputText] = useState<string>('2.0');

  // Estados dedicados para las horas de sueño
  const [sleepHours, setSleepHours] = useState<number>(8.0);
  const [sleepHoursInput, setSleepHoursInput] = useState<string>('8.0');

  const slideAnim = useRef(new Animated.Value(1)).current;

  const loadTodayStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    const targetUser = userEmail || userName;
    const status = await habitService.getTodayStatus(targetUser);

    if (status.success) {
      if (status.serverDate) setServerDate(status.serverDate);

      if (status.completedToday && status.record) {
        // Activar bloqueo y confirmación si ya completó el día
        setIsLockedToday(true);
        setIsConfirmed(true);
        setHabits({
          comida: status.record.comida ?? null,
          ejercicio: status.record.ejercicio ?? null,
          hidratacion: status.record.hidratacion ? Number(status.record.hidratacion) : 2.0,
          ansiedad: status.record.ansiedad ?? null,
          sueno: status.record.sueno ?? null,
          sueno_horas: status.record.sueno_horas ? Number(status.record.sueno_horas) : 8.0,
          estres: status.record.estres ?? null,
        });
      } else {
        // Si no ha registrado hoy, mantener desbloqueado
        setIsLockedToday(false);
        setIsConfirmed(false);
      }
    }

    setIsLoadingStatus(false);
  }, [userEmail, userName]);

  useEffect(() => {
    void loadTodayStatus();
  }, [loadTodayStatus]);

  const openHabitModal = (key: HabitKey) => {
    if (isLockedToday) {
      Alert.alert(
        'Check-in completado',
        `Ya has registrado tus hábitos del día (${formatToChileanDate(serverDate || recordDate)}). Por metodología clínica, la evaluación se realiza una sola vez al día. Podrás registrar nuevamente a partir de mañana.`
      );
      return;
    }

    setActiveHabit(key);
    const currentVal = habits[key];

    if (key === 'hidratacion') {
      const initialWater = currentVal ?? 2.0;
      setWaterLiters(initialWater);
      setWaterInputText(String(initialWater));
    } else if (key === 'sueno') {
      setRating(currentVal);
      if (currentVal !== null) {
        slideAnim.setValue(currentVal);
      }
      const initialSleep = habits.sueno_horas ?? 8.0;
      setSleepHours(initialSleep);
      setSleepHoursInput(String(initialSleep));
    } else {
      setRating(currentVal);
      if (currentVal !== null) {
        slideAnim.setValue(currentVal);
      }
    }

    setModalVisible(true);
  };

  const selectRating = (val: number) => {
    if (rating === null) {
      slideAnim.setValue(val);
    } else {
      Animated.spring(slideAnim, {
        toValue: val,
        useNativeDriver: false,
        speed: 20,
        bounciness: 4,
      }).start();
    }
    setRating(val);
  };

  const saveHabitResponse = () => {
    if (!activeHabit) return;

    if (activeHabit === 'hidratacion') {
      const parsed = Number.parseFloat(waterInputText.replace(',', '.'));
      const finalVal = !Number.isNaN(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : waterLiters;
      setHabits((prev) => ({ ...prev, hidratacion: finalVal }));
      setModalVisible(false);
      setActiveHabit(null);
    } else if (activeHabit === 'sueno') {
      if (rating !== null) {
        const parsed = Number.parseFloat(sleepHoursInput.replace(',', '.'));
        const finalHours = !Number.isNaN(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : sleepHours;
        setHabits((prev) => ({ ...prev, sueno: rating, sueno_horas: finalHours }));
        setModalVisible(false);
        setActiveHabit(null);
      }
    } else if (rating !== null) {
      setHabits((prev) => ({ ...prev, [activeHabit]: rating }));
      setModalVisible(false);
      setActiveHabit(null);
    }
  };

  const registeredCount = useMemo(
    () => HABIT_KEYS.filter((key) => habits[key] !== null).length,
    [habits]
  );

  const slideInterpolation = slideAnim.interpolate({
    inputRange: RATING_SCALE.map((item) => item.value),
    outputRange: ['0%', '100%', '200%', '300%', '400%'],
    extrapolate: 'clamp',
  });

  const indicatorColor = slideAnim.interpolate({
    inputRange: RATING_SCALE.map((item) => item.value),
    outputRange: RATING_SCALE.map((item) => item.color),
    extrapolate: 'clamp',
  });

  const handleConfirm = async () => {
    if (isLockedToday) {
      Alert.alert(
        'Check-in completado',
        'Ya has registrado tus hábitos para el día de hoy. Tu próxima evaluación estará habilitada mañana.'
      );
      return;
    }

    if (registeredCount < 6) {
      Alert.alert(
        'Hábitos incompletos',
        `Debes registrar los 6 hábitos antes de poder confirmar el envío. Actualmente llevas ${registeredCount} de 6.`
      );
      return;
    }

    const confirmedAt = formatToMySqlDateTime();

    const mySqlRecord: MySqlDailyHabitRecord = {
      user_id: userEmail || userName,
      evaluation_date: serverDate || recordDate,
      comida: habits.comida,
      ejercicio: habits.ejercicio,
      hidratacion: habits.hidratacion,
      ansiedad: habits.ansiedad,
      sueno: habits.sueno,
      sueno_horas: habits.sueno_horas ?? null,
      estres: habits.estres,
      confirmed_at: confirmedAt,
    };

    const response = await habitService.saveDailyCheckIn(mySqlRecord);

    if (response.success) {
      if (onSaveRecord) {
        onSaveRecord(mySqlRecord);
      }
      setIsConfirmed(true);
      setIsLockedToday(true);
      Alert.alert(
        '¡Hábitos Registrados!',
        'Tus hábitos del día han sido guardados exitosamente. Podrás volver a registrar a partir de mañana.',
        [{ text: 'Aceptar', style: 'default' }]
      );
    } else {
      Alert.alert('Aviso', response.error || 'No se pudo registrar.');
      if (response.isLocked) {
        setIsLockedToday(true);
        setIsConfirmed(true);
      }
    }
  };

  const renderRatingSection = () => (
    <View style={styles.ratingSection}>
      <View style={styles.segmentedControl}>
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              opacity: rating === null ? 0 : 1,
              transform: [{ translateX: slideInterpolation }],
              backgroundColor: indicatorColor,
            },
          ]}
        />
        {RATING_SCALE.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={styles.segmentButton}
            onPress={() => selectRating(item.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentLabel,
                rating === item.value && styles.segmentLabelActive,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {getRatingLabel(item.value, activeHabit)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.registerButton,
          rating === null && styles.registerButtonDisabled,
        ]}
        disabled={rating === null}
        onPress={saveHabitResponse}
        activeOpacity={0.8}
      >
        <Text style={styles.registerButtonText}>Guardar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModalContent = () => {
    if (activeHabit === 'hidratacion') {
      return (
        <View style={styles.waterModalContainer}>
          <View style={styles.waterCounterRow}>
            <TouchableOpacity
              style={styles.waterStepBtn}
              onPress={() => {
                const next = Math.max(0, Math.round((waterLiters - 0.25) * 100) / 100);
                setWaterLiters(next);
                setWaterInputText(String(next));
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={26} color={COLORS.waterAction} />
            </TouchableOpacity>

            <View style={styles.waterInputBox}>
              <TextInput
                style={styles.waterInput}
                value={waterInputText}
                onChangeText={(val) => {
                  setWaterInputText(val);
                  const num = Number.parseFloat(val.replace(',', '.'));
                  if (!Number.isNaN(num) && num >= 0) {
                    setWaterLiters(num);
                  }
                }}
                keyboardType="decimal-pad"
              />
              <Text style={styles.waterUnitText}>Lts</Text>
            </View>

            <TouchableOpacity
              style={styles.waterStepBtn}
              onPress={() => {
                const next = Math.round((waterLiters + 0.25) * 100) / 100;
                setWaterLiters(next);
                setWaterInputText(String(next));
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={26} color={COLORS.waterAction} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={saveHabitResponse}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeHabit === 'sueno') {
      return (
        <View style={styles.sleepSection}>
          <Text style={styles.sectionSubtitle}>Horas dormidas:</Text>
          <View style={styles.sleepCounterRow}>
            <TouchableOpacity
              style={styles.sleepStepBtn}
              onPress={() => {
                const next = Math.max(0, Math.round((sleepHours - 0.5) * 10) / 10);
                setSleepHours(next);
                setSleepHoursInput(String(next));
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={22} color={COLORS.textHeading} />
            </TouchableOpacity>

            <View style={styles.sleepInputBox}>
              <TextInput
                style={styles.sleepInput}
                value={sleepHoursInput}
                onChangeText={(val) => {
                  setSleepHoursInput(val);
                  const num = Number.parseFloat(val.replace(',', '.'));
                  if (!Number.isNaN(num) && num >= 0) {
                    setSleepHours(num);
                  }
                }}
                keyboardType="decimal-pad"
              />
              <Text style={styles.sleepUnitText}>horas</Text>
            </View>

            <TouchableOpacity
              style={styles.sleepStepBtn}
              onPress={() => {
                const next = Math.round((sleepHours + 0.5) * 10) / 10;
                setSleepHours(next);
                setSleepHoursInput(String(next));
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color={COLORS.textHeading} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionSubtitle, styles.sleepQualitySubtitle]}>Calidad de descanso:</Text>
          {renderRatingSection()}
        </View>
      );
    }

    return renderRatingSection();
  };

  const getSectionSubText = () => {
    if (isLockedToday) {
      return 'Registro completado por hoy';
    }
    if (registeredCount < 6) {
      return `Te faltan ${6 - registeredCount} por completar`;
    }
    return 'Todos los hábitos evaluados';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoadingStatus}
            onRefresh={loadTodayStatus}
            colors={[COLORS.textMuted]}
            tintColor={COLORS.textMuted}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 85, 110) },
        ]}
      >
        <View style={styles.headerSpacer}>
          <Text style={styles.greeting}>Hola, {userName}!</Text>
          <Text style={styles.subGreeting}>Comienza tus hábitos de hoy</Text>
          
        </View>

        {isLoadingStatus && (
          <View style={styles.loadingStatus}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}

        <View style={styles.gridContainer}>
          {/* Encabezado interno con ícono, título y la badge con el nro de hábitos */}
          <View style={styles.sectionHeader}>
            <View style={styles.titleGroup}>
              <View style={styles.iconBadge}>
                <Ionicons name="leaf-outline" size={ms(18)} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Hábitos diarios</Text>
                <Text style={styles.sectionSubText}>
                  {getSectionSubText()}
                </Text>
              </View>
            </View>

            {/* Badge con el nro de hábitos completados */}
            <View style={[styles.countBadge, isLockedToday && styles.countBadgeSuccess]}>
              <Text style={styles.countText}>{registeredCount}/6 completados</Text>
            </View>
          </View>

          {/* Separador */}
          <View style={styles.divider} />

          {/* Sub-grid con las 6 tarjetas de hábitos */}
          <View style={styles.gridInner}>
            {HABIT_KEYS.map((key) => {
              const item = HABIT_CATALOG[key];
              const currentVal = habits[key];

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.card,
                    { backgroundColor: HABIT_CARD_COLORS[key] },
                    isLockedToday && styles.cardLocked,
                    currentVal !== null && styles.cardActiveBorder,
                  ]}
                  onPress={() => openHabitModal(key)}
                  activeOpacity={isLockedToday ? 0.9 : 0.7}
                >
                  <View style={styles.imageFrame}>
                    {item.image ? (
                      <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.emoji}>{item.emoji}</Text>
                    )}
                    {currentVal !== null && (
                      <View style={styles.cardCheckBadge}>
                        <Ionicons name="checkmark" size={12} color={COLORS.white} />
                      </View>
                    )}
                  </View>

                  <Text style={styles.cardTitle}>{item.label}</Text>

                  {currentVal === null && (
                    <View style={styles.iconContainer}>
                      <Ionicons name="arrow-forward" size={ms(14)} color={COLORS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sección inferior: Estado bloqueado o Botón de confirmación */}
          {isLockedToday ? (
            <View style={styles.lockedBottomContainer}>
              <View style={styles.lockedBottomBadge}>
                <Ionicons name="happy-outline" size={18} color={COLORS.primary} style={styles.lockedBottomHappyIcon} />
                <Ionicons name="lock-closed" size={16} color={COLORS.primary} style={styles.lockedBottomLockIcon} />
                <Text style={styles.lockedBottomBadgeText}>Evaluación completada por hoy</Text>
              </View>
              <Text style={styles.lockedBottomHelpText}>
                Próximo check-in habilitado mañana.
              </Text>
            </View>
          ) : (
            !isConfirmed && (
              <View style={styles.confirmationSection}>
                <TouchableOpacity
                  style={[
                    styles.globalConfirmButton,
                    registeredCount < 6 && styles.globalConfirmDisabled,
                  ]}
                  disabled={registeredCount < 6}
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                >
                  <View style={styles.confirmButtonContent}>
                    {registeredCount === 6 && (
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.white} style={styles.confirmIcon} />
                    )}
                    <Text
                      style={[
                        styles.globalConfirmText,
                        registeredCount < 6 && styles.globalConfirmDisabledText,
                      ]}
                    >
                      {registeredCount === 6 ? 'Registrar hábitos' : 'Registrar'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>

        {/* Modal de calificación */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={COLORS.closeIcon} />
              </TouchableOpacity>

              {activeHabit && (
                <View
                  style={[
                    styles.modalIconArea,
                    activeHabit === 'hidratacion' && styles.waterModalIconArea,
                  ]}
                >
                  {HABIT_CATALOG[activeHabit].image ? (
                    <Image
                      source={HABIT_CATALOG[activeHabit].image}
                      style={styles.modalHabitImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.modalEmoji}>{HABIT_CATALOG[activeHabit].emoji}</Text>
                  )}
                </View>
              )}

              <Text style={styles.questionText}>
                {activeHabit ? HABIT_CATALOG[activeHabit].question : '¿Cómo evalúas este concepto hoy?'}
              </Text>

              {renderModalContent()}
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
      {onNavigateTab && (
        <PatientBottomNav activeTab="habits" onNavigate={onNavigateTab} />
      )}
    </SafeAreaView>
  );
};

// Estilos 

const styles = StyleSheet.create({
  // Estructura principal de la pantalla
  container: { flex: 1, backgroundColor: COLORS.screenBackground },
  scrollContent: { paddingHorizontal: s(16), paddingTop: vs(14) },
  loadingStatus: { paddingVertical: 1, alignItems: 'center' },
  ratingSection: { width: '100%', alignItems: 'center' },

  // Encabezado y resumen de progreso de hábitos
  headerSpacer: {
    marginTop: 40,
    marginBottom: vs(32),
    paddingHorizontal: s(4),
    justifyContent: 'center',
  },
  greeting: { fontSize: ms(21), fontWeight: '600', color: COLORS.textPrimary },
  subGreeting: { fontSize: ms(14), fontWeight: '500', color: COLORS.textSecondary, marginLeft: vs(5), marginTop: vs(6)},

  // Tarjeta principal y encabezado de la cuadrícula
  gridContainer: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: ms(24),
    padding: s(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: vs(14),
    marginTop: vs(10),
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    flex: 1,
  },
  iconBadge: {
    width: s(36),
    height: s(36),
    borderRadius: ms(12),
    backgroundColor: COLORS.greenSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: ms(16),
    fontWeight: '700',
    color: COLORS.textHeading,
  },
  sectionSubText: {
    fontSize: ms(11),
    color: COLORS.textMuted,
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: COLORS.screenBackground,
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: ms(12),
  },
  countBadgeSuccess: {
    backgroundColor: COLORS.greenBadge,
  },
  countText: {
    fontSize: ms(11),
    fontWeight: '700',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: vs(5),
    marginBottom: vs(20),
  },

  // Cuadrícula y tarjetas individuales
  gridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: vs(20),
  },

  iconContainer: {
    marginTop: vs(6),
  },
  card: {
    width: '30%',
    minHeight: vs(120),
    borderRadius: ms(18),
    padding: s(8),
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  cardActiveBorder: {
    borderWidth: 2,
    borderColor: COLORS.greenBorder,
  },
  cardLocked: { opacity: 0.95, borderColor: COLORS.greenBorder },
  imageFrame: {
    width: '100%',
    height: vs(70),
    borderRadius: ms(12),
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardCheckBadge: {
    position: 'absolute',
    bottom: s(10),
    right: s(4),
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: COLORS.greenSuccess,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: ms(40) },
  cardImage: { width: '100%', height: '100%' },
  cardTitle: { fontSize: ms(12), fontWeight: '500', color: COLORS.textPrimary, alignSelf: 'center', marginTop: vs(4) },

  // Confirmación de la evaluación diaria
  confirmationSection: {
    width: '100%',
    marginTop: vs(16),
    paddingTop: vs(14),
    borderTopColor: COLORS.dividerSoft,
    alignItems: 'center',
  },


  //registrar habitos boton
  globalConfirmButton: {
    backgroundColor: COLORS.registerButton,
    width: '50%',
    alignSelf: 'center',
    height: vs(45),
    paddingVertical: vs(12),
    borderRadius: ms(14),
    borderWidth: 1,
    borderColor: COLORS.registerButton,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  globalConfirmDisabled: {
    backgroundColor: COLORS.disabledBackground,
    borderColor: COLORS.disabledBorder,
    shadowOpacity: 0,
  },
  confirmButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  confirmIcon: { marginRight: s(6) },
  globalConfirmText: { color: COLORS.surface, fontSize: ms(14), fontWeight: 'bold', alignSelf: 'center' },
  globalConfirmDisabledText: { color: COLORS.textMuted, fontSize: ms(14), fontWeight: '700' },

  // Estado visible cuando la evaluación diaria ya está bloqueada
  lockedBottomContainer: {
    marginTop: vs(10),
    alignItems: 'center',
    paddingVertical: vs(10),
  },
  lockedBottomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenSoft,
    paddingVertical: vs(10),
    paddingHorizontal: s(20),
    borderRadius: ms(25),
    borderWidth: 1,
    borderColor: COLORS.greenOutline,
    marginBottom: vs(6),
  },
  lockedBottomBadgeText: {
    color: COLORS.greenPrimary,
    fontSize: ms(14),
    fontWeight: '600',
  },
  lockedBottomHappyIcon: {
    marginRight: s(17),
  },
  lockedBottomLockIcon: { marginRight: s(6) },
  lockedBottomHelpText: {
    fontSize: ms(12),
    color: COLORS.textPrimary,
    fontWeight: '500',
  },

  // Contenedor y encabezado del modal de calificación
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: ms(20),
    padding: s(18),
    alignItems: 'center',
    elevation: 5,
    position: 'relative',
  },
  modalCloseButton: { position: 'absolute', top: vs(12), right: s(12), zIndex: 10, padding: s(4) },
  modalIconArea: {
    width: s(88),
    height: s(88),
    borderWidth: 2,
    borderColor: COLORS.greenBorder,
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(14),
  },
  waterModalIconArea: { borderColor: COLORS.greenBorder, backgroundColor: COLORS.blueSoft },
  modalEmoji: { fontSize: ms(44) },
  modalHabitImage: { width: s(60), height: s(60) },
  questionText: { fontSize: ms(15), fontWeight: '600', color: COLORS.textQuestion, marginBottom: vs(16), textAlign: 'center' },

  // Escala de calificación compartida por los hábitos
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.disabledBackground,
    borderRadius: ms(25),
    padding: s(4),
    width: '100%',
    marginBottom: vs(18),
    position: 'relative',
  },
  slidingIndicator: {
    position: 'absolute',
    top: s(4),
    bottom: s(4),
    left: s(4),
    width: '20%',
    borderRadius: ms(20),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentButton: { flex: 1, paddingVertical: vs(10), paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  segmentLabel: { fontSize: ms(10), fontWeight: '700', color: COLORS.ratingLabel, textAlign: 'center' },
  segmentLabelActive: { color: COLORS.ratingLabelActive },

  registerButton: {
    backgroundColor: COLORS.greenAction,
    paddingVertical: vs(11),
    paddingHorizontal: s(44),
    borderRadius: ms(25),
    marginTop: vs(4),
  },
  registerButtonDisabled: { backgroundColor: COLORS.textDisabled },
  registerButtonText: { color: COLORS.surface, fontSize: ms(15), fontWeight: 'bold' },

  // Controles específicos para registrar hidratación
  waterModalContainer: { width: '90%', alignItems: 'center', paddingVertical: vs(6)},
  waterCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: vs(16) },
  waterStepBtn: {
    width: s(30),
    height: s(30),
    borderRadius: s(23),
    backgroundColor: COLORS.blueSoft,
    borderWidth: 1.5,
    borderColor: COLORS.blueBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterInputBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginHorizontal: s(9),
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.blueInputBorder,
    borderRadius: ms(14),
    paddingHorizontal: s(16),
    paddingVertical: vs(8),
   
  },
  waterInput: { fontSize: ms(25), fontWeight: '600', color: COLORS.blueText, textAlign: 'center', minWidth: s(25) },
  waterUnitText: { fontSize: ms(15), fontWeight: '600', color: COLORS.waterUnit, marginLeft: s(6) },

  // Controles específicos para registrar horas y calidad del sueño
  sectionSubtitle: { fontSize: ms(13), fontWeight: '700', color: COLORS.textSubdued, alignSelf: 'flex-start', marginBottom: vs(8), marginTop: vs(4) },
  sleepQualitySubtitle: { marginTop: vs(14) },
  sleepSection: { width: '100%', alignItems: 'center', marginTop: vs(2), marginBottom: vs(12) },
  sleepCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: vs(6) },
  sleepStepBtn: {
    width: s(42),
    height: s(42),
    borderRadius: s(21),
    backgroundColor: COLORS.sleepControlBackground,
    borderWidth: 1.5,
    borderColor: COLORS.slateBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepInputBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginHorizontal: s(12),
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.slateBorder,
    borderRadius: ms(14),
    paddingHorizontal: s(14),
    paddingVertical: vs(6),
    minWidth: s(120),
  },
  sleepInput: { fontSize: ms(22), fontWeight: '800', color: COLORS.textHeading, textAlign: 'center', minWidth: s(40) },
  sleepUnitText: { fontSize: ms(13.5), fontWeight: '600', color: COLORS.sleepUnit, marginLeft: s(6) },
});