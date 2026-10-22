import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HabitKey } from '../types/habits';
import { HabitPeriod, HabitReportFilters } from '../navigation/types';
import { DatePickerModal } from './DatePickerModal';
import { formatToChileanDate } from '../utils/date';

const COLORS = {
  food: '#D97706',
  foodSoft: '#FEF3C7',
  exercise: '#16A34A',
  greenSoft: '#DCFCE7',
  hydration: '#0284C7',
  blueSoft: '#E0F2FE',
  sleep: '#7C3AED',
  purpleSoft: '#EDE9FE',
  anxiety: '#E11D48',
  roseSoft: '#FFE4E6',
  stress: '#2563EB',
  bluePale: '#DBEAFE',
  primary: '#1A7A54',
  white: '#FFFFFF',
  gray500: '#6B7280',
  gray600: '#64748B',
  gray700: '#475569',
  gray800: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate400: '#94A3B8',
  border: '#CBD5E1',
  borderSoft: '#E2E8F0',
  gray100: '#F3F4F6',
  gray50: '#F8FAFC',
  slate100: '#F1F5F9',
  greenSubtle: '#E8F5EE',
  greenSelected: '#F3FAF6',
  overlay: 'rgba(15, 23, 42, 0.55)',
  black: '#000',
  red: '#DC2626',
} as const;

interface HabitFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (filters: HabitReportFilters) => void;
  initialFilters?: HabitReportFilters;
}

interface PeriodOption {
  key: HabitPeriod;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: 'therapy_start', label: 'Inicio de terapia', sublabel: 'Desde primera sesión a hoy', icon: 'flag-outline' },
  { key: 'week', label: 'Última semana', sublabel: 'Últimos 7 días', icon: 'calendar-outline' },
  { key: 'month', label: 'Último mes', sublabel: 'Últimos 30 días', icon: 'calendar' },
  { key: '3months', label: 'Últimos 3 meses', sublabel: 'Últimos 90 días', icon: 'stats-chart-outline' },
  { key: '6months', label: 'Últimos 6 meses', sublabel: 'Semestre clínico', icon: 'trending-up-outline' },
  { key: 'year', label: 'El último año', sublabel: 'Anual (365 días)', icon: 'time-outline' },
  { key: 'custom', label: 'Fecha específica', sublabel: 'Día único o rango personalizado', icon: 'calendar-number-outline' },
];

interface HabitOption {
  key: HabitKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const HABIT_OPTIONS: HabitOption[] = [
  { key: 'comida', label: 'Comida', icon: 'restaurant-outline', color: COLORS.food, bgColor: COLORS.foodSoft },
  { key: 'ejercicio', label: 'Ejercicio', icon: 'barbell-outline', color: COLORS.exercise, bgColor: COLORS.greenSoft },
  { key: 'hidratacion', label: 'Hidratación', icon: 'water-outline', color: COLORS.hydration, bgColor: COLORS.blueSoft },
  { key: 'sueno', label: 'Sueño', icon: 'moon-outline', color: COLORS.sleep, bgColor: COLORS.purpleSoft },
  { key: 'ansiedad', label: 'Ansiedad', icon: 'pulse-outline', color: COLORS.anxiety, bgColor: COLORS.roseSoft },
  { key: 'estres', label: 'Estrés', icon: 'flash-outline', color: COLORS.stress, bgColor: COLORS.bluePale },
];

const ALL_HABIT_KEYS: HabitKey[] = ['comida', 'ejercicio', 'hidratacion', 'sueno', 'ansiedad', 'estres'];

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const HabitFilterModal: React.FC<HabitFilterModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialFilters,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<HabitPeriod>(
    initialFilters?.period === 'day' ? 'custom' : (initialFilters?.period || 'month')
  );
  const [selectedHabits, setSelectedHabits] = useState<HabitKey[]>(
    initialFilters?.habits && initialFilters.habits.length > 0
      ? initialFilters.habits
      : ALL_HABIT_KEYS
  );
  const [startDate, setStartDate] = useState<string>(
    initialFilters?.startDate || initialFilters?.specificDate || getTodayStr()
  );
  const [endDate, setEndDate] = useState<string>(
    initialFilters?.endDate || initialFilters?.specificDate || getTodayStr()
  );
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (visible && initialFilters) {
      setSelectedPeriod(initialFilters.period === 'day' ? 'custom' : initialFilters.period);
      setSelectedHabits(
        initialFilters.habits && initialFilters.habits.length > 0
          ? initialFilters.habits
          : ALL_HABIT_KEYS
      );
      setStartDate(initialFilters.startDate || initialFilters.specificDate || getTodayStr());
      setEndDate(initialFilters.endDate || initialFilters.specificDate || getTodayStr());
    }
  }, [visible, initialFilters]);

  const isAllSelected = selectedHabits.length === ALL_HABIT_KEYS.length;

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedHabits([]);
    } else {
      setSelectedHabits([...ALL_HABIT_KEYS]);
    }
  };

  const toggleHabit = (key: HabitKey) => {
    if (selectedHabits.includes(key)) {
      setSelectedHabits(selectedHabits.filter((h) => h !== key));
    } else {
      setSelectedHabits([...selectedHabits, key]);
    }
  };

  const handleConfirm = () => {
    if (selectedHabits.length === 0) return;
    const isCustom = selectedPeriod === 'custom' || selectedPeriod === 'day';
    const isSingleDay = startDate === endDate;

    let period: HabitPeriod = selectedPeriod;
    if (isCustom) {
      period = isSingleDay ? 'day' : 'custom';
    }

    onConfirm({
      period,
      habits: selectedHabits,
      startDate: isCustom ? startDate : undefined,
      endDate: isCustom ? endDate : undefined,
      specificDate: isCustom && isSingleDay ? startDate : undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrapper}>
              <Ionicons name="analytics" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.title}>Registro de Hábitos</Text>
              <Text style={styles.subtitle}>Configura el informe clínico a consultar</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={COLORS.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Sección 1: Temporalidad */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="time" size={17} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Período de tiempo</Text>
              </View>
              <Text style={styles.sectionHelper}>
                Selecciona el rango de fechas que deseas evaluar:
              </Text>

              <View style={styles.periodsGrid}>
                {PERIOD_OPTIONS.map((item) => {
                  const isSelected = selectedPeriod === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.periodCard,
                        isSelected && styles.periodCardSelected,
                      ]}
                      onPress={() => setSelectedPeriod(item.key)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.periodCardHeader}>
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={isSelected ? COLORS.primary : COLORS.gray500}
                        />
                        <View
                          style={[
                            styles.radioIndicator,
                            isSelected && styles.radioIndicatorSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.periodLabel,
                          isSelected && styles.periodLabelSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.periodSublabel}>{item.sublabel}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selector si es "Rango de fechas" o retrocompatibilidad con "day" */}
              {(selectedPeriod === 'custom' || selectedPeriod === 'day') && (
                <View style={styles.specificDateBox}>
                  <Text style={styles.specificDateTitle}>Seleccionar días a evaluar:</Text>
                  <View style={styles.dateRangeRow}>
                    <View style={styles.dateRangeCol}>
                      <Text style={styles.dateRangeLabel}>Desde (Inicio):</Text>
                      <TouchableOpacity
                        style={styles.datePickerTrigger}
                        onPress={() => setActiveDatePicker('start')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.datePickerTriggerText}>
                          {formatToChileanDate(startDate)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.dateRangeCol}>
                      <Text style={styles.dateRangeLabel}>Hasta (Fin):</Text>
                      <TouchableOpacity
                        style={styles.datePickerTrigger}
                        onPress={() => setActiveDatePicker('end')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-sharp" size={16} color={COLORS.primary} />
                        <Text style={styles.datePickerTriggerText}>
                          {formatToChileanDate(endDate)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.rangeSummaryText}>
                    {startDate === endDate
                      ? `Jornada única: ${formatToChileanDate(startDate)}`
                      : `Rango del ${formatToChileanDate(startDate)} al ${formatToChileanDate(endDate)}`}
                  </Text>
                </View>
              )}
            </View>

            {/* Sección 2: Hábitos a evaluar */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="heart" size={17} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Hábitos a incluir</Text>
                <TouchableOpacity
                  style={[
                    styles.selectAllBtn,
                    isAllSelected && styles.selectAllBtnActive,
                  ]}
                  onPress={toggleAll}
                >
                  <Text
                    style={[
                      styles.selectAllBtnText,
                      isAllSelected && styles.selectAllBtnTextActive,
                    ]}
                  >
                    {isAllSelected ? 'Deseleccionar todos' : 'Todos los hábitos'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionHelper}>
                Puedes seleccionar uno, varios o todos los parámetros clínicos:
              </Text>

              <View style={styles.habitsList}>
                {HABIT_OPTIONS.map((habit) => {
                  const isChecked = selectedHabits.includes(habit.key);
                  return (
                    <TouchableOpacity
                      key={habit.key}
                      style={[
                        styles.habitRow,
                        isChecked && styles.habitRowChecked,
                      ]}
                      onPress={() => toggleHabit(habit.key)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.habitIconBox,
                          { backgroundColor: habit.bgColor },
                        ]}
                      >
                        <Ionicons name={habit.icon} size={20} color={habit.color} />
                      </View>
                      <Text style={styles.habitRowLabel}>{habit.label}</Text>
                      <View
                        style={[
                          styles.checkbox,
                          isChecked && styles.checkboxChecked,
                        ]}
                      >
                        {isChecked && (
                          <Ionicons name="checkmark" size={16} color={COLORS.white} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer con botón de confirmación */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                selectedHabits.length === 0 && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={selectedHabits.length === 0}
              activeOpacity={0.85}
            >
              <Ionicons name="bar-chart" size={20} color={COLORS.white} />
              <Text style={styles.confirmBtnText}>Ver Informe Clínico</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
            {selectedHabits.length === 0 && (
              <Text style={styles.warningText}>
                Debes seleccionar al menos un hábito para generar el informe.
              </Text>
            )}
          </View>
        </View>

        {/* Modal de calendario para fecha de inicio o fecha de fin */}
        <DatePickerModal
          visible={activeDatePicker !== null}
          initialDate={activeDatePicker === 'start' ? startDate : endDate}
          title={activeDatePicker === 'start' ? 'Seleccionar Fecha de Inicio' : 'Seleccionar Fecha de Término'}
          maxDate={new Date()}
          onClose={() => setActiveDatePicker(null)}
          onSelectDate={(formattedDate) => {
            if (activeDatePicker === 'start') {
              setStartDate(formattedDate);
              if (formattedDate > endDate) {
                setEndDate(formattedDate);
              }
            } else {
              setEndDate(formattedDate);
              if (formattedDate < startDate) {
                setStartDate(formattedDate);
              }
            }
            setActiveDatePicker(null);
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.greenSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate900,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate800,
    marginLeft: 6,
    flex: 1,
  },
  sectionHelper: {
    fontSize: 12,
    color: COLORS.gray600,
    marginBottom: 12,
  },
  periodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodCard: {
    width: '48.5%',
    backgroundColor: COLORS.gray50,
    borderWidth: 1.5,
    borderColor: COLORS.borderSoft,
    borderRadius: 14,
    padding: 12,
  },
  periodCardSelected: {
    backgroundColor: COLORS.greenSelected,
    borderColor: COLORS.primary,
  },
  periodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  radioIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioIndicatorSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  periodLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  periodSublabel: {
    fontSize: 11,
    color: COLORS.slate400,
    marginTop: 2,
  },
  specificDateBox: {
    marginTop: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 12,
  },
  specificDateTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 6,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  dateRangeCol: {
    flex: 1,
  },
  dateRangeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray600,
    marginBottom: 4,
  },
  rangeSummaryText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  datePickerTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate900,
    marginLeft: 6,
    flex: 1,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.slate100,
  },
  selectAllBtnActive: {
    backgroundColor: COLORS.greenSubtle,
  },
  selectAllBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  selectAllBtnTextActive: {
    color: COLORS.primary,
  },
  habitsList: {
    gap: 8,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  habitRowChecked: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
  },
  habitIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate800,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
    backgroundColor: COLORS.white,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: COLORS.slate400,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 11,
    color: COLORS.red,
    textAlign: 'center',
    marginTop: 6,
  },
});
