import React, { useState, useRef, useMemo, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HabitKey, DailyHabitRatings, MySqlDailyHabitRecord } from '../../types/habits';
import {
  HABIT_CATALOG,
  HABIT_KEYS,
  RATING_SCALE,
  INITIAL_HABITS_STATE,
  getRatingColor,
  getRatingLabel,
} from '../../constants/habits';
import { PatientBottomNav, PatientTab } from '../../components/PatientBottomNav';
import { formatToMySqlDate, formatToMySqlDateTime } from '../../utils/date';
import { habitService } from '../../services';

interface DailyCheckInScreenProps {
  onBack?: () => void;
  onSaveRecord?: (record: MySqlDailyHabitRecord) => void;
  userName?: string;
  userEmail?: string;
  onNavigateTab?: (tab: PatientTab) => void;
}

export const DailyCheckInScreen: React.FC<DailyCheckInScreenProps> = ({
  onBack,
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
  const [nextDate, setNextDate] = useState('');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Estados dedicados para la ingesta de agua (litros)
  const [waterLiters, setWaterLiters] = useState<number>(2.0);
  const [waterInputText, setWaterInputText] = useState<string>('2.0');

  // Estados dedicados para las horas de sueño
  const [sleepHours, setSleepHours] = useState<number>(8.0);
  const [sleepHoursInput, setSleepHoursInput] = useState<string>('8.0');

  const slideAnim = useRef(new Animated.Value(1)).current;

  // Consulta al servidor en cada render/visita para comprobar si hoy ya se completó el registro
  useEffect(() => {
    let isMounted = true;

    async function loadTodayStatus() {
      setIsLoadingStatus(true);
      const targetUser = userEmail || userName;
      const status = await habitService.getTodayStatus(targetUser);

      if (isMounted) {
        if (status.success) {
          if (status.serverDate) setServerDate(status.serverDate);
          if (status.nextDate) setNextDate(status.nextDate);

          if (status.completedToday && status.record) {
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
            setIsLockedToday(false);
            setIsConfirmed(false);
          }
        }
        setIsLoadingStatus(false);
      }
    }

    loadTodayStatus();

    return () => {
      isMounted = false;
    };
  }, [userEmail, userName]);

  const openHabitModal = (key: HabitKey) => {
    if (isLockedToday) {
      Alert.alert(
        'Check-in completado',
        `Ya has registrado tus hábitos del día (${serverDate || recordDate}). Por metodología clínica, la evaluación se realiza una sola vez al día. Podrás registrar nuevamente a partir de mañana.`
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
      if ((response as any).isLocked) {
        setIsLockedToday(true);
        setIsConfirmed(true);
      }
    }
  };

  const renderRatingSection = () => (
    <View style={{ width: '100%', alignItems: 'center' }}>
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
              <Ionicons name="remove" size={26} color="#2563EB" />
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
              <Ionicons name="add" size={26} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.waterSaveButton}
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
          <Text style={styles.sectionSubtitle}>Horas dormidas anoche:</Text>
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
              <Ionicons name="remove" size={22} color="#1E293B" />
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
              <Ionicons name="add" size={22} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionSubtitle, { marginTop: 14 }]}>Calidad de descanso:</Text>
          {renderRatingSection()}
        </View>
      );
    }

    return renderRatingSection();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 85, 110) },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {onBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="#0F613B" />
              </TouchableOpacity>
            )}
            <View>
              <Text style={styles.greeting}>Hola, {userName}!</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressNumber}>{registeredCount}/6</Text>
          <Text style={styles.progressText}>
            {isLockedToday ? 'Hábitos completados hoy' : 'Hábitos registrados'}
          </Text>
        </View>

        {isLoadingStatus && (
          <View style={{ paddingVertical: 1, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#0F613B" />
          </View>
        )}

        {/* Cuadrícula de hábitos */}
        <View style={styles.grid}>
          {HABIT_KEYS.map((key) => {
            const item = HABIT_CATALOG[key];
            const currentVal = habits[key];
            const cardColor = getRatingColor(currentVal, key);

            let labelText = item.label;
            if (key === 'hidratacion' && currentVal !== null) {
              labelText = currentVal === 1 ? '1 Litro' : `${currentVal} Litros`;
            } else if (key === 'sueno' && currentVal !== null) {
              const qualityLabel = getRatingLabel(currentVal, 'sueno');
              const hours = habits.sueno_horas;
              labelText = hours !== null && hours !== undefined ? `${qualityLabel} • ${hours}h` : qualityLabel;
            }

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.card,
                  isLockedToday && styles.cardLocked,
                ]}
                onPress={() => openHabitModal(key)}
                activeOpacity={isLockedToday ? 0.9 : 0.7}
              >
                <View style={styles.cardIconArea}>
                  {item.image ? (
                    <Image source={item.image} style={styles.habitImage} resizeMode="contain" />
                  ) : (
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  )}
                  {isLockedToday && (
                    <View style={styles.cardLockIconBadge}>
                      <Ionicons name="lock-closed" size={12} color="#0F613B" />
                    </View>
                  )}
                </View>
                <View style={[styles.cardLabelArea, { backgroundColor: cardColor }]}>
                  <Text
                    style={[
                      styles.cardLabel,
                      currentVal !== null && styles.cardLabelActiveText,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {labelText}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sección inferior: Bloqueado vs Botón de Confirmación */}
        {isLockedToday ? (
          <View style={styles.lockedBottomContainer}>
            <View style={styles.lockedBottomBadge}>
              <Ionicons name="lock-closed" size={16} color="#0F613B" style={{ marginRight: 6 }} />
              <Text style={styles.lockedBottomBadgeText}>Registro finalizado por hoy</Text>
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
                <Text
                  style={[
                    styles.globalConfirmText,
                    registeredCount < 6 && styles.globalConfirmDisabledText,
                  ]}
                >
                  {registeredCount === 6 ? 'Registrar Hábitos' : 'Registrar'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>

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
              <Ionicons name="close" size={22} color="#888" />
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

      {onNavigateTab && (
        <PatientBottomNav activeTab="habits" onNavigate={onNavigateTab} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 12, padding: 4 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
  headerDate: { fontSize: 13.5, color: '#6B7280', marginTop: 2, fontWeight: '500' },

  // Banner de bloqueo superior
  lockedBannerCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#0F613B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lockedBannerIconBadge: {
    marginRight: 12,
  },
  lockedBannerTextWrapper: {
    flex: 1,
  },
  lockedBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F613B',
    marginBottom: 3,
  },
  lockedBannerDesc: {
    fontSize: 12.5,
    color: '#374151',
    lineHeight: 17,
  },

  progressCard: { borderWidth: 1.5, borderColor: '#A5C1B3', borderRadius: 15, padding: 18, backgroundColor: '#E4EDE7', alignItems: 'center', marginBottom: 24 },
  progressNumber: { fontSize: 24, fontWeight: '700', color: '#0F613B' },
  progressText: { fontSize: 15, color: '#374151', marginTop: 4, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '46%', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 14, marginBottom: 20, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  cardLocked: { opacity: 0.95, borderColor: '#BBF7D0' },
  cardIconArea: { height: 100, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cardLockIconBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#E8F5E9', padding: 4, borderRadius: 10 },
  emoji: { fontSize: 50 },
  habitImage: { width: 65, height: 65 },
  cardLabelArea: { borderTopWidth: 1.5, borderColor: '#E5E7EB', paddingVertical: 10, alignItems: 'center' },
  cardLabel: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  cardLabelActiveText: { color: '#FFFFFF', fontWeight: '700' },

  confirmationSection: { marginTop: 10, alignItems: 'center' },
  globalConfirmButton: { backgroundColor: '#0F613B', width: '100%', paddingVertical: 15, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  globalConfirmDisabled: { backgroundColor: '#C2D6CC' },
  globalConfirmText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  globalConfirmDisabledText: { color: '#5A7568', fontSize: 15, fontWeight: '600' },

  // Sección inferior bloqueada
  lockedBottomContainer: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  lockedBottomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 8,
  },
  lockedBottomBadgeText: {
    color: '#0F613B',
    fontSize: 15,
    fontWeight: '700',
  },
  lockedBottomHelpText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5, position: 'relative' },
  modalCloseButton: { position: 'absolute', top: 14, right: 14, zIndex: 10, padding: 4 },
  modalIconArea: { width: 100, height: 100, borderWidth: 2, borderColor: '#C6E3D1', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  waterModalIconArea: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  modalEmoji: { fontSize: 50 },
  modalHabitImage: { width: 65, height: 65 },
  questionText: { fontSize: 16, fontWeight: '600', color: '#4b5563', marginBottom: 20, textAlign: 'center' },

  segmentedControl: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 25, padding: 4, width: '100%', marginBottom: 20, position: 'relative' },
  slidingIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, width: '20%', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 },
  segmentButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  segmentLabel: { fontSize: 10.5, fontWeight: '700', color: '#9ca3af', textAlign: 'center' },
  segmentLabelActive: { color: '#FFFFFF' },

  registerButton: { backgroundColor: '#0F613B', paddingVertical: 12, paddingHorizontal: 50, borderRadius: 25, marginTop: 4 },
  registerButtonDisabled: { backgroundColor: '#9ca3af' },
  registerButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // Estilos de Agua
  waterModalContainer: { width: '100%', alignItems: 'center', paddingVertical: 6 },
  waterCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  waterStepBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center' },
  waterInputBox: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginHorizontal: 16, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#93C5FD', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 8, minWidth: 140 },
  waterInput: { fontSize: 28, fontWeight: '800', color: '#1E3A8A', textAlign: 'center', minWidth: 50 },
  waterUnitText: { fontSize: 16, fontWeight: '600', color: '#3B82F6', marginLeft: 8 },
  waterSaveButton: { backgroundColor: '#2563EB', paddingVertical: 14, paddingHorizontal: 60, borderRadius: 25, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3, marginTop: 8 },

  // Estilos de Sueño
  sectionSubtitle: { fontSize: 13.5, fontWeight: '700', color: '#475569', alignSelf: 'flex-start', marginBottom: 8, marginTop: 4 },
  sleepSection: { width: '100%', alignItems: 'center', marginTop: 2, marginBottom: 14 },
  sleepCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  sleepStepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  sleepInputBox: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginHorizontal: 14, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6, minWidth: 125 },
  sleepInput: { fontSize: 24, fontWeight: '800', color: '#1E293B', textAlign: 'center', minWidth: 44 },
  sleepUnitText: { fontSize: 14.5, fontWeight: '600', color: '#64748B', marginLeft: 6 },
});
