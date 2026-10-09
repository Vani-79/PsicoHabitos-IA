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
  { key: 'comida', label: 'Comida', icon: 'restaurant-outline', color: '#D97706', bgColor: '#FEF3C7' },
  { key: 'ejercicio', label: 'Ejercicio', icon: 'barbell-outline', color: '#16A34A', bgColor: '#DCFCE7' },
  { key: 'hidratacion', label: 'Hidratación', icon: 'water-outline', color: '#0284C7', bgColor: '#E0F2FE' },
  { key: 'sueno', label: 'Sueño', icon: 'moon-outline', color: '#7C3AED', bgColor: '#EDE9FE' },
  { key: 'ansiedad', label: 'Ansiedad', icon: 'pulse-outline', color: '#E11D48', bgColor: '#FFE4E6' },
  { key: 'estres', label: 'Estrés', icon: 'flash-outline', color: '#2563EB', bgColor: '#DBEAFE' },
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
              <Ionicons name="analytics" size={24} color="#1A7A54" />
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
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Sección 1: Temporalidad */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="time" size={17} color="#1A7A54" />
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
                          color={isSelected ? '#1A7A54' : '#6B7280'}
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
                        <Ionicons name="calendar-outline" size={16} color="#1A7A54" />
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
                        <Ionicons name="calendar-sharp" size={16} color="#1A7A54" />
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
                <Ionicons name="heart" size={17} color="#1A7A54" />
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
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
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
              <Ionicons name="bar-chart" size={20} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Ver Informe Clínico</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
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
    borderBottomColor: '#F1F5F9',
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
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
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
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
    color: '#1E293B',
    marginLeft: 6,
    flex: 1,
  },
  sectionHelper: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  periodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodCard: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  periodCardSelected: {
    backgroundColor: '#F3FAF6',
    borderColor: '#1A7A54',
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
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioIndicatorSelected: {
    borderColor: '#1A7A54',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1A7A54',
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  periodLabelSelected: {
    color: '#1A7A54',
    fontWeight: '700',
  },
  periodSublabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  specificDateBox: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  specificDateTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
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
    color: '#64748B',
    marginBottom: 4,
  },
  rangeSummaryText: {
    fontSize: 11,
    color: '#1A7A54',
    fontWeight: '600',
    marginTop: 2,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  datePickerTriggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 6,
    flex: 1,
  },
  changeDatePill: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeDatePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A7A54',
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  selectAllBtnActive: {
    backgroundColor: '#E8F5EE',
  },
  selectAllBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  selectAllBtnTextActive: {
    color: '#1A7A54',
  },
  habitsList: {
    gap: 8,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  habitRowChecked: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1A7A54',
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
    color: '#1E293B',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#1A7A54',
    borderColor: '#1A7A54',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A7A54',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#1A7A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 11,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 6,
  },
});
