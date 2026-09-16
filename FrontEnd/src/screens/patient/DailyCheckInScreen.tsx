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
import { PatientBottomNav, PatientTab } from '../../components/PatientBottomNav';
import { formatToMySqlDate, formatToMySqlDateTime } from '../../utils/date';
import { habitService } from '../../services';
import { s, vs, ms } from '../../utils/responsive';

interface DailyCheckInScreenProps {
  onBack?: () => void;
  onSaveRecord?: (record: MySqlDailyHabitRecord) => void;
  userName?: string;
  userEmail?: string;
  onNavigateTab?: (tab: PatientTab) => void;
}

const HABIT_CARD_COLORS: Record<HabitKey, string> = {
  comida: '#FFF1D8',
  ejercicio: '#E7F8E5',
  hidratacion: '#DFF7FF',
  ansiedad: '#FDE2E4',
  sueno: '#F0E7FF',
  estres: '#E3F0FF',
};

const HABIT_CARD_BORDER_COLORS: Record<HabitKey, string> = {
  comida: '#E3A72F',
  ejercicio: '#4A9F45',
  hidratacion: '#2596B5',
  ansiedad: '#D97786',
  sueno: '#8962B8',
  estres: '#4B83C4',
};

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const WEEKDAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

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
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const displayDate = useMemo(() => {
    const [year, month, day] = (serverDate || recordDate).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return `${WEEKDAY_NAMES[date.getDay()]}, ${day} de ${MONTH_NAMES[month - 1]}`;
  }, [recordDate, serverDate]);

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
  }, [userEmail, userName]);

  useEffect(() => {
    loadTodayStatus();
  }, [loadTodayStatus]);

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
        refreshControl={
          <RefreshControl
            refreshing={isLoadingStatus}
            onRefresh={loadTodayStatus}
            colors={['#64748B']}
            tintColor="#64748B"
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 85, 110) },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.greeting}>Hola, {userName}!</Text>
                <Text style={styles.welcomeText}>Qué bueno verte hoy</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.progressDate}>{displayDate}</Text>

        <View style={styles.progressCard}>
          <Text style={styles.progressNumber}>{registeredCount}/6</Text>
          <Text style={styles.progressEmoji}>🌱</Text>
          <View style={styles.progressTextGroup}>
            <Text style={styles.progressText}>
              {isLockedToday ? 'Hábitos completados hoy' : 'Hábitos evaluados'}
            </Text>
            {!isLockedToday && registeredCount < 6 && (
              <Text style={styles.progressHelpText}>
                Te faltan {6 - registeredCount} por completar
              </Text>
            )}
          </View>
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

            let labelText = item.label;
            if (key === 'hidratacion' && currentVal !== null) {
              labelText = currentVal === 1 ? '1 Litro' : `${currentVal} Litros`;
            } else if (key === 'sueno' && currentVal !== null) {
              const qualityLabel = getRatingLabel(currentVal, 'sueno');
              const hours = habits.sueno_horas;
              labelText = hours !== null && hours !== undefined ? `${qualityLabel} • ${hours}h` : qualityLabel;
            } else if (currentVal !== null) {
              labelText = getRatingLabel(currentVal, key);
            }

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.card,
                  { backgroundColor: HABIT_CARD_COLORS[key] },
                  isLockedToday && styles.cardLocked,
                  currentVal !== null && {
                    borderWidth: 2,
                    borderColor: HABIT_CARD_BORDER_COLORS[key],
                  },
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
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                  {isLockedToday && (
                    <View style={styles.cardLockIconBadge}>
                      <Ionicons name="lock-closed" size={12} color="#0F613B" />
                    </View>
                  )}
                </View>
                <Text style={styles.cardTitle}>{item.label}</Text>
                <Text
                  style={styles.cardSubtitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {currentVal !== null ? labelText : 'Comenzar'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sección inferior: Bloqueado vs Botón de Confirmación */}
        {isLockedToday ? (
          <View style={styles.lockedBottomContainer}>
            <View style={styles.lockedBottomBadge}>
              <Ionicons name="happy-outline" size={18} color="#0F613B" style={styles.lockedBottomHappyIcon} />
              <Ionicons name="lock-closed" size={16} color="#0F613B" style={{ marginRight: 6 }} />
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
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={styles.confirmIcon} />
                  )}
                  <Text
                    style={[
                      styles.globalConfirmText,
                      registeredCount < 6 && styles.globalConfirmDisabledText,
                    ]}
                  >
                    {registeredCount === 6 ? 'Registrar Hábitos' : 'Registrar'}
                  </Text>
                </View>
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
  container: { flex: 1, backgroundColor: '#EAF5EE' },
  scrollContent: { paddingHorizontal: s(16), paddingTop: vs(14) },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: vs(22),
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: ms(21), fontWeight: 'bold', color: '#1F2937' },
  welcomeText: { fontSize: ms(12.5), color: '#64748B', marginTop: vs(4), fontWeight: '600' },
  headerDate: { fontSize: ms(13), color: '#6B7280', marginTop: vs(4), fontWeight: '500' },
  progressDate: {
    alignSelf: 'flex-end',
    fontSize: ms(12.5),
    color: '#6B7280',
    marginTop: 0,
    marginBottom: vs(8),
    fontWeight: '500',
  },

  // Banner de bloqueo superior
  lockedBannerCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: ms(16),
    padding: s(12),
    marginBottom: vs(16),
    alignItems: 'center',
    shadowColor: '#0F613B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lockedBannerIconBadge: {
    marginRight: s(10),
  },
  lockedBannerTextWrapper: {
    flex: 1,
  },
  lockedBannerTitle: {
    fontSize: ms(14.5),
    fontWeight: '700',
    color: '#0F613B',
    marginBottom: vs(2),
  },
  lockedBannerDesc: {
    fontSize: ms(12),
    color: '#374151',
    lineHeight: ms(16.5),
  },

  progressCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D9ECDC',
    borderRadius: ms(18),
    paddingVertical: vs(12),
    paddingHorizontal: s(14),
    backgroundColor: '#F7FCF8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(10),
    marginBottom: vs(16),
  },
  progressNumber: { fontSize: ms(26), fontWeight: '800', color: '#64748B' },
  progressEmoji: { fontSize: ms(20) },
  progressTextGroup: { alignItems: 'center' },
  progressText: { fontSize: ms(13.5), color: '#374151', marginTop: 0, fontWeight: '600' },
  progressHelpText: { fontSize: ms(11), color: '#64748B', marginTop: vs(3) },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: ms(20),
    padding: s(12),
    paddingTop: vs(16),
    borderWidth: 1,
    borderColor: '#E9EEF0',
    rowGap: vs(14),
  },
  card: {
    width: '48%',
    minHeight: vs(165),
    borderRadius: ms(18),
    padding: s(12),
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLocked: { opacity: 0.95, borderColor: '#BBF7D0' },
  imageFrame: {
    width: '100%',
    height: vs(78),
    borderRadius: ms(12),
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardCheckBadge: {
    position: 'absolute',
    top: s(6),
    left: s(6),
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: '#4A9F45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLockIconBadge: {
    position: 'absolute',
    top: s(6),
    right: s(6),
    backgroundColor: '#E8F5E9',
    padding: s(4),
    borderRadius: ms(8),
  },
  emoji: { fontSize: ms(44) },
  cardImage: { width: '100%', height: '100%' },
  cardTitle: { fontSize: ms(15.5), fontWeight: '700', color: '#1F2937' },
  cardSubtitle: { fontSize: ms(11.5), color: '#475569', marginTop: vs(4) },

  confirmationSection: { marginTop: vs(22), alignItems: 'center' },
  globalConfirmButton: {
    backgroundColor: '#D9DEE3',
    width: '85%',
    maxWidth: s(320),
    alignSelf: 'center',
    minHeight: vs(46),
    paddingVertical: vs(12),
    borderRadius: ms(14),
    borderWidth: 1,
    borderColor: '#B8C0C8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  globalConfirmDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E1E5E9', shadowOpacity: 0 },
  confirmButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  confirmIcon: { marginRight: s(6) },
  globalConfirmText: { color: '#374151', fontSize: ms(16), fontWeight: 'bold' },
  globalConfirmDisabledText: { color: '#64748B', fontSize: ms(14), fontWeight: '600' },

  // Sección inferior bloqueada
  lockedBottomContainer: {
    marginTop: vs(10),
    alignItems: 'center',
    paddingVertical: vs(10),
  },
  lockedBottomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: vs(10),
    paddingHorizontal: s(20),
    borderRadius: ms(25),
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: vs(6),
  },
  lockedBottomBadgeText: {
    color: '#0F613B',
    fontSize: ms(14),
    fontWeight: '700',
  },
  lockedBottomHappyIcon: {
    marginRight: s(6),
  },
  lockedBottomHelpText: {
    fontSize: ms(12),
    color: '#6B7280',
    fontWeight: '500',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
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
    borderColor: '#C6E3D1',
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(14),
  },
  waterModalIconArea: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  modalEmoji: { fontSize: ms(44) },
  modalHabitImage: { width: s(60), height: s(60) },
  questionText: { fontSize: ms(15), fontWeight: '600', color: '#4b5563', marginBottom: vs(16), textAlign: 'center' },

  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentButton: { flex: 1, paddingVertical: vs(10), paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  segmentLabel: { fontSize: ms(10), fontWeight: '700', color: '#9ca3af', textAlign: 'center' },
  segmentLabelActive: { color: '#334155' },

  registerButton: {
    backgroundColor: '#0F613B',
    paddingVertical: vs(11),
    paddingHorizontal: s(44),
    borderRadius: ms(25),
    marginTop: vs(4),
  },
  registerButtonDisabled: { backgroundColor: '#9ca3af' },
  registerButtonText: { color: '#FFFFFF', fontSize: ms(15), fontWeight: 'bold' },

  // Estilos de Agua
  waterModalContainer: { width: '100%', alignItems: 'center', paddingVertical: vs(6) },
  waterCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: vs(16) },
  waterStepBtn: {
    width: s(46),
    height: s(46),
    borderRadius: s(23),
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterInputBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginHorizontal: s(12),
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: ms(14),
    paddingHorizontal: s(16),
    paddingVertical: vs(8),
    minWidth: s(130),
  },
  waterInput: { fontSize: ms(26), fontWeight: '800', color: '#1E3A8A', textAlign: 'center', minWidth: s(46) },
  waterUnitText: { fontSize: ms(15), fontWeight: '600', color: '#3B82F6', marginLeft: s(6) },
  waterSaveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: vs(12),
    paddingHorizontal: s(50),
    borderRadius: ms(25),
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    marginTop: vs(8),
  },

  // Estilos de Sueño
  sectionSubtitle: { fontSize: ms(13), fontWeight: '700', color: '#475569', alignSelf: 'flex-start', marginBottom: vs(8), marginTop: vs(4) },
  sleepSection: { width: '100%', alignItems: 'center', marginTop: vs(2), marginBottom: vs(12) },
  sleepCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: vs(6) },
  sleepStepBtn: {
    width: s(42),
    height: s(42),
    borderRadius: s(21),
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepInputBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginHorizontal: s(12),
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: ms(14),
    paddingHorizontal: s(14),
    paddingVertical: vs(6),
    minWidth: s(120),
  },
  sleepInput: { fontSize: ms(22), fontWeight: '800', color: '#1E293B', textAlign: 'center', minWidth: s(40) },
  sleepUnitText: { fontSize: ms(13.5), fontWeight: '600', color: '#64748B', marginLeft: s(6) },
});

