import React, { useState, useRef, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HabitKey, DailyHabitRatings, MySqlDailyHabitRecord } from '../types/habits';
import {
  HABIT_CATALOG,
  HABIT_KEYS,
  RATING_SCALE,
  INITIAL_HABITS_STATE,
  getRatingColor,
  getRatingLabel,
} from '../constants/habits';
import { PatientBottomNav, PatientTab } from '../components/PatientBottomNav';

interface DailyCheckInScreenProps {
  onBack?: () => void;
  onSaveRecord?: (record: MySqlDailyHabitRecord) => void;
  userName?: string;
  onNavigateTab?: (tab: PatientTab) => void;
}

export const DailyCheckInScreen: React.FC<DailyCheckInScreenProps> = ({
  onBack,
  onSaveRecord,
  userName = 'Vani',
  onNavigateTab,
}) => {
  const insets = useSafeAreaInsets();

  // Fecha estipulada en formato estándar MySQL 'YYYY-MM-DD' (para columna tipo DATE)
  const recordDate = useMemo(() => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [habits, setHabits] = useState<DailyHabitRatings>(INITIAL_HABITS_STATE);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeHabit, setActiveHabit] = useState<HabitKey | null>(null);
  const [rating, setRating] = useState<number | null>(null);

  // Estados dedicados para la ingesta de agua (litros)
  const [waterLiters, setWaterLiters] = useState<number>(2.0);
  const [waterInputText, setWaterInputText] = useState<string>('2.0');

  // Estados dedicados para las horas de sueño
  const [sleepHours, setSleepHours] = useState<number>(8.0);
  const [sleepHoursInput, setSleepHoursInput] = useState<string>('8.0');

  const slideAnim = useRef(new Animated.Value(1)).current;

  const openHabitModal = (key: HabitKey) => {
    setActiveHabit(key);
    const currentVal = habits[key];

    if (key === 'hidratacion') {
      const initialWater = currentVal ?? 2.0;
      setWaterLiters(initialWater);
      setWaterInputText(String(initialWater));
    } else if (key === 'sueno') {
      setRating(currentVal);
      slideAnim.setValue(currentVal ?? 1);
      const initialSleep = habits.sueno_horas ?? 8.0;
      setSleepHours(initialSleep);
      setSleepHoursInput(String(initialSleep));
    } else {
      setRating(currentVal);
      slideAnim.setValue(currentVal ?? 1);
    }

    setModalVisible(true);
  };

  const selectRating = (val: number) => {
    setRating(val);
    Animated.spring(slideAnim, {
      toValue: val,
      useNativeDriver: false,
      speed: 20,
      bounciness: 4,
    }).start();
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

  const translateX = slideAnim.interpolate({
    inputRange: RATING_SCALE.map((item) => item.value),
    outputRange: ['0%', '100%', '200%', '300%', '400%'],
    extrapolate: 'clamp',
  });

  const indicatorColor = slideAnim.interpolate({
    inputRange: RATING_SCALE.map((item) => item.value),
    outputRange: RATING_SCALE.map((item) => item.color),
    extrapolate: 'clamp',
  });

  const handleConfirm = () => {
    if (registeredCount < 6) {
      Alert.alert(
        'Hábitos incompletos',
        `Debes registrar los 6 hábitos antes de poder confirmar el envío. Actualmente llevas ${registeredCount} de 6.`
      );
      return;
    }

    const now = new Date();
    const confirmedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Registro estipulado con tipos nativos para MySQL (DATE y DATETIME)
    const mySqlRecord: MySqlDailyHabitRecord = {
      user_id: userName,
      evaluation_date: recordDate, // DATE en MySQL: 'YYYY-MM-DD'
      comida: habits.comida,
      ejercicio: habits.ejercicio,
      hidratacion: habits.hidratacion,
      ansiedad: habits.ansiedad,
      sueno: habits.sueno,
      sueno_horas: habits.sueno_horas ?? null,
      estres: habits.estres,
      confirmed_at: confirmedAt,   // DATETIME en MySQL: 'YYYY-MM-DD HH:MM:SS'
    };

    console.log('Registro estipulado y preparado para MySQL:', mySqlRecord);

    if (onSaveRecord) {
      onSaveRecord(mySqlRecord);
    }

    setIsConfirmed(true);
    Alert.alert(
      '¡Hábitos Registrados!',
      'Tus hábitos del día han sido registrados exitosamente.',
      [{ text: 'Aceptar', style: 'default' }]
    );
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
          <Text style={styles.progressText}>Hábitos registrados</Text>
        </View>

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
                style={styles.card}
                onPress={() => openHabitModal(key)}
                activeOpacity={0.7}
                disabled={isConfirmed}
              >
                <View style={styles.cardIconArea}>
                  {item.image ? (
                    <Image source={item.image} style={styles.habitImage} resizeMode="contain" />
                  ) : (
                    <Text style={styles.emoji}>{item.emoji}</Text>
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

        {/* Botón Registrar Hábitos (desaparece completamente al ser presionado) */}
        {!isConfirmed && (
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
                {registeredCount === 6
                  ? 'Registrar Hábitos'
                  : `Registrar`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

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

            {activeHabit === 'hidratacion' ? (
              <View style={styles.waterModalContainer}>
                {/* Contador con Stepper */}
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
                      selectTextOnFocus
                      maxLength={4}
                    />
                    <Text style={styles.waterUnitText}>Litros</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.waterStepBtn}
                    onPress={() => {
                      const next = Math.min(10, Math.round((waterLiters + 0.25) * 100) / 100);
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
                  activeOpacity={0.85}
                >
                  <Text style={styles.registerButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {activeHabit === 'sueno' && (
                  <Text style={styles.sectionSubtitle}>Calidad del descanso:</Text>
                )}

                <View style={styles.segmentedControl}>
                  <Animated.View
                    style={[
                      styles.slidingIndicator,
                      {
                        opacity: rating === null ? 0 : 1,
                        transform: [{ translateX }],
                        backgroundColor: indicatorColor,
                      },
                    ]}
                  />

                  {RATING_SCALE.map((item) => {
                    const label = getRatingLabel(item.value, activeHabit);

                    return (
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
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {activeHabit === 'sueno' && (
                  <View style={styles.sleepSection}>
                    <Text style={styles.sectionSubtitle}>Horas de sueño dormidas:</Text>
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
                        <Ionicons name="remove" size={24} color="#374151" />
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
                          selectTextOnFocus
                          maxLength={4}
                        />
                        <Text style={styles.sleepUnitText}>Horas</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.sleepStepBtn}
                        onPress={() => {
                          const next = Math.min(24, Math.round((sleepHours + 0.5) * 10) / 10);
                          setSleepHours(next);
                          setSleepHoursInput(String(next));
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={24} color="#374151" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.registerButton, rating === null && styles.registerButtonDisabled]}
                  onPress={saveHabitResponse}
                  disabled={rating === null}
                >
                  <Text style={styles.registerButtonText}>Guardar</Text>
                </TouchableOpacity>
              </>
            )}

          </Pressable>
        </Pressable>
      </Modal>

      {/* Barra de navegación inferior (4 botones, con elevación sobre botones nativos) */}
      <PatientBottomNav
        activeTab="habits"
        onNavigate={(tab) => {
          if (onNavigateTab) {
            onNavigateTab(tab);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEBEB' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 12, padding: 4 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#6A8296' },
  date: { fontSize: 16, color: '#6A8296' },
  progressCard: { borderWidth: 1.5, borderColor: '#A5C1B3', borderRadius: 15, padding: 20, backgroundColor: '#E4EDE7', alignItems: 'center', marginBottom: 30 },
  progressNumber: { fontSize: 24, fontWeight: '500', color: '#7E9186' },
  progressText: { fontSize: 18, color: '#7E9186', marginTop: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '46%', borderWidth: 1.5, borderColor: '#B5B5B5', borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  cardIconArea: { height: 100, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 50 },
  habitImage: { width: 65, height: 65 },
  cardLabelArea: { borderTopWidth: 1.5, borderColor: '#B5B5B5', paddingVertical: 10, alignItems: 'center' },
  cardLabel: { fontSize: 16, fontWeight: '500', color: '#6A6A6A' },
  cardLabelActiveText: { color: '#FFFFFF', fontWeight: 'bold' },

  confirmationSection: { marginTop: 10, alignItems: 'center' },
  globalConfirmButton: { backgroundColor: '#0F613B', width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  globalConfirmDisabled: { backgroundColor: '#C2D6CC' },
  globalConfirmText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  globalConfirmDisabledText: { color: '#5A7568', fontSize: 15, fontWeight: '600' },

  confirmedBox: { backgroundColor: '#E4EDE7', width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#A5C1B3' },
  confirmedText: { color: '#0F613B', fontSize: 16, fontWeight: 'bold' },

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

  // Estilos dedicados para el bloque de Agua (Litros)
  waterModalContainer: { width: '100%', alignItems: 'center', paddingVertical: 6 },
  waterCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  waterStepBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center' },
  waterInputBox: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginHorizontal: 16, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#93C5FD', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 8, minWidth: 140 },
  waterInput: { fontSize: 28, fontWeight: '800', color: '#1E3A8A', textAlign: 'center', minWidth: 50 },
  waterUnitText: { fontSize: 16, fontWeight: '600', color: '#3B82F6', marginLeft: 8 },
  waterSaveButton: { backgroundColor: '#2563EB', paddingVertical: 14, paddingHorizontal: 60, borderRadius: 25, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3, marginTop: 8 },

  // Estilos dedicados para el bloque de Sueño
  sectionSubtitle: { fontSize: 13.5, fontWeight: '700', color: '#475569', alignSelf: 'flex-start', marginBottom: 8, marginTop: 4 },
  sleepSection: { width: '100%', alignItems: 'center', marginTop: 2, marginBottom: 14 },
  sleepCounterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  sleepStepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  sleepInputBox: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginHorizontal: 14, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6, minWidth: 125 },
  sleepInput: { fontSize: 24, fontWeight: '800', color: '#1E293B', textAlign: 'center', minWidth: 44 },
  sleepUnitText: { fontSize: 14.5, fontWeight: '600', color: '#64748B', marginLeft: 6 },
});
