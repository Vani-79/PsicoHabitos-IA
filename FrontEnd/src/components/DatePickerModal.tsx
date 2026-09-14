import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerModalProps {
  visible: boolean;
  initialDate?: string; // Formato 'YYYY-MM-DD'
  title?: string;
  maxDate?: Date;
  minDate?: Date;
  onClose: () => void;
  onSelectDate: (formattedDate: string, dateObj: Date) => void;
}

type ViewMode = 'calendar' | 'year' | 'month';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  initialDate,
  title = 'Seleccionar Fecha',
  maxDate,
  minDate,
  onClose,
  onSelectDate,
}) => {
  // Parsear fecha inicial respetando límites
  const parseInitial = () => {
    let candidate = new Date();
    if (initialDate && initialDate.includes('-')) {
      const parts = initialDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          candidate = new Date(y, m, d);
        }
      }
    }

    // Si excede maxDate, limitar al maxDate
    if (maxDate && candidate > maxDate) {
      candidate = new Date(maxDate.getTime());
    }
    if (minDate && candidate < minDate) {
      candidate = new Date(minDate.getTime());
    }
    return candidate;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(parseInitial);
  const [displayedYear, setDisplayedYear] = useState<number>(selectedDate.getFullYear());
  const [displayedMonth, setDisplayedMonth] = useState<number>(selectedDate.getMonth());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  const yearScrollRef = useRef<ScrollView>(null);

  // Sincronizar cuando se abra
  useEffect(() => {
    if (visible) {
      const d = parseInitial();
      setSelectedDate(d);
      setDisplayedYear(d.getFullYear());
      setDisplayedMonth(d.getMonth());
      setViewMode('calendar');
    }
  }, [visible, initialDate]);

  // Lista de años: delimitada estrictamente por maxDate (ej. hasta 2010 para nacimiento)
  const yearList = useMemo(() => {
    const startYear = maxDate ? maxDate.getFullYear() : 2035;
    const endYear = minDate ? minDate.getFullYear() : 1930;
    const years: number[] = [];
    for (let y = startYear; y >= endYear; y--) {
      years.push(y);
    }
    return years;
  }, [maxDate, minDate]);

  // Calcular días del mes actual
  const daysInMonth = useMemo(() => {
    return new Date(displayedYear, displayedMonth + 1, 0).getDate();
  }, [displayedYear, displayedMonth]);

  // Día de la semana en que empieza el mes (0 = Lunes, 6 = Domingo)
  const firstDayOfWeek = useMemo(() => {
    const raw = new Date(displayedYear, displayedMonth, 1).getDay();
    return (raw + 6) % 7;
  }, [displayedYear, displayedMonth]);

  // Validar si el mes siguiente excede maxDate
  const isNextMonthDisabled = useMemo(() => {
    if (!maxDate) return false;
    return (
      displayedYear > maxDate.getFullYear() ||
      (displayedYear === maxDate.getFullYear() && displayedMonth >= maxDate.getMonth())
    );
  }, [displayedYear, displayedMonth, maxDate]);

  // Validar si el mes anterior es menor que minDate
  const isPrevMonthDisabled = useMemo(() => {
    if (!minDate) return false;
    return (
      displayedYear < minDate.getFullYear() ||
      (displayedYear === minDate.getFullYear() && displayedMonth <= minDate.getMonth())
    );
  }, [displayedYear, displayedMonth, minDate]);

  // Navegar meses
  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    if (displayedMonth === 0) {
      setDisplayedMonth(11);
      setDisplayedYear((prev) => prev - 1);
    } else {
      setDisplayedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextMonthDisabled) return;
    if (displayedMonth === 11) {
      setDisplayedMonth(0);
      setDisplayedYear((prev) => prev + 1);
    } else {
      setDisplayedMonth((prev) => prev + 1);
    }
  };

  // Validar si un día en el mes actual está deshabilitado por maxDate o minDate
  const isDayDisabled = (dayNumber: number) => {
    const currentDayDate = new Date(displayedYear, displayedMonth, dayNumber);
    if (maxDate) {
      const maxDayDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      if (currentDayDate > maxDayDate) return true;
    }
    if (minDate) {
      const minDayDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      if (currentDayDate < minDayDate) return true;
    }
    return false;
  };

  const handleSelectDay = (day: number) => {
    if (isDayDisabled(day)) return;
    const newDate = new Date(displayedYear, displayedMonth, day);
    setSelectedDate(newDate);
  };

  const handleSelectYear = (year: number) => {
    setDisplayedYear(year);

    // Ajustar mes si el año es el año máximo y el mes supera el mes máximo
    let targetMonth = displayedMonth;
    if (maxDate && year === maxDate.getFullYear() && targetMonth > maxDate.getMonth()) {
      targetMonth = maxDate.getMonth();
      setDisplayedMonth(targetMonth);
    }

    const daysInTargetMonth = new Date(year, targetMonth + 1, 0).getDate();
    let targetDay = Math.min(selectedDate.getDate(), daysInTargetMonth);

    // Ajustar si el día excede maxDate
    if (maxDate && year === maxDate.getFullYear() && targetMonth === maxDate.getMonth()) {
      targetDay = Math.min(targetDay, maxDate.getDate());
    }

    setSelectedDate(new Date(year, targetMonth, targetDay));
    setViewMode('calendar');
  };

  const handleSelectMonth = (monthIndex: number) => {
    if (isMonthDisabled(monthIndex)) return;
    setDisplayedMonth(monthIndex);

    const daysInTargetMonth = new Date(displayedYear, monthIndex + 1, 0).getDate();
    let targetDay = Math.min(selectedDate.getDate(), daysInTargetMonth);

    if (maxDate && displayedYear === maxDate.getFullYear() && monthIndex === maxDate.getMonth()) {
      targetDay = Math.min(targetDay, maxDate.getDate());
    }

    setSelectedDate(new Date(displayedYear, monthIndex, targetDay));
    setViewMode('calendar');
  };

  const isMonthDisabled = (monthIndex: number) => {
    if (!maxDate) return false;
    return displayedYear === maxDate.getFullYear() && monthIndex > maxDate.getMonth();
  };

  const handleConfirm = () => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;
    onSelectDate(formatted, selectedDate);
    onClose();
  };

  const handleSelectToday = () => {
    let target = new Date();
    if (maxDate && target > maxDate) {
      target = new Date(maxDate.getTime());
    }
    setSelectedDate(target);
    setDisplayedYear(target.getFullYear());
    setDisplayedMonth(target.getMonth());
    setViewMode('calendar');
  };

  // Formato para mostrar arriba: ej. "14 de Mayo, 1998"
  const headerDateString = useMemo(() => {
    const d = selectedDate.getDate();
    const mName = MONTH_NAMES[selectedDate.getMonth()];
    const y = selectedDate.getFullYear();
    return `${d} de ${mName}, ${y}`;
  }, [selectedDate]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>

          {/* Encabezado del Modal */}
          <View style={styles.header}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.selectedDateHeadline}>{headerDateString}</Text>
          </View>

          {/* Barra de Selección Rápida de Año y Mes */}
          <View style={styles.selectorBar}>
            <View style={styles.pillsRow}>
              {/* Botón selector de AÑO */}
              <TouchableOpacity
                style={[
                  styles.selectorPill,
                  viewMode === 'year' && styles.selectorPillActive,
                ]}
                onPress={() => setViewMode(viewMode === 'year' ? 'calendar' : 'year')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.selectorPillText,
                    viewMode === 'year' && styles.selectorPillTextActive,
                  ]}
                >
                  Año {displayedYear}
                </Text>
                <Ionicons
                  name={viewMode === 'year' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={viewMode === 'year' ? '#FFFFFF' : '#0F613B'}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>

              {/* Botón selector de MES */}
              <TouchableOpacity
                style={[
                  styles.selectorPill,
                  viewMode === 'month' && styles.selectorPillActive,
                ]}
                onPress={() => setViewMode(viewMode === 'month' ? 'calendar' : 'month')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.selectorPillText,
                    viewMode === 'month' && styles.selectorPillTextActive,
                  ]}
                >
                  {MONTH_NAMES[displayedMonth]}
                </Text>
                <Ionicons
                  name={viewMode === 'month' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={viewMode === 'month' ? '#FFFFFF' : '#0F613B'}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>

            {/* Flechas de cambio rápido de mes */}
            {viewMode === 'calendar' && (
              <View style={styles.arrowsRow}>
                <TouchableOpacity
                  style={[styles.arrowButton, isPrevMonthDisabled && styles.arrowButtonDisabled]}
                  onPress={handlePrevMonth}
                  disabled={isPrevMonthDisabled}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={isPrevMonthDisabled ? '#CBD5E1' : '#0F613B'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.arrowButton, isNextMonthDisabled && styles.arrowButtonDisabled]}
                  onPress={handleNextMonth}
                  disabled={isNextMonthDisabled}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isNextMonthDisabled ? '#CBD5E1' : '#0F613B'}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* VISTA 1: Selector de AÑOS Rápido (Cuadrícula delimitada por maxDate) */}
          {viewMode === 'year' && (
            <View style={styles.yearViewContainer}>
              <Text style={styles.subviewHint}>Toca un año para seleccionarlo:</Text>
              <ScrollView
                ref={yearScrollRef}
                style={styles.yearScroll}
                contentContainerStyle={styles.yearGrid}
                showsVerticalScrollIndicator={true}
              >
                {yearList.map((y) => {
                  const isCurrent = y === displayedYear;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[styles.yearChip, isCurrent && styles.yearChipActive]}
                      onPress={() => handleSelectYear(y)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.yearChipText, isCurrent && styles.yearChipTextActive]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* VISTA 2: Selector de MESES Rápido */}
          {viewMode === 'month' && (
            <View style={styles.monthViewContainer}>
              <Text style={styles.subviewHint}>Toca un mes para seleccionarlo:</Text>
              <View style={styles.monthGrid}>
                {MONTH_NAMES.map((name, index) => {
                  const isCurrent = index === displayedMonth;
                  const isDisabled = isMonthDisabled(index);
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[
                        styles.monthChip,
                        isCurrent && styles.monthChipActive,
                        isDisabled && styles.monthChipDisabled,
                      ]}
                      onPress={() => handleSelectMonth(index)}
                      disabled={isDisabled}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.monthChipText,
                          isCurrent && styles.monthChipTextActive,
                          isDisabled && styles.monthChipTextDisabled,
                        ]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* VISTA 3: Cuadrícula del Calendario Mensual */}
          {viewMode === 'calendar' && (
            <View style={styles.calendarContainer}>
              {/* Días de la semana */}
              <View style={styles.weekDaysRow}>
                {WEEK_DAYS.map((wd, i) => (
                  <Text key={i} style={styles.weekDayText}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Días del mes */}
              <View style={styles.daysGrid}>
                {/* Espacios vacíos antes del primer día */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.emptyDayCell} />
                ))}

                {/* Días del 1 al N */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNumber = i + 1;
                  const isSelected =
                    selectedDate.getFullYear() === displayedYear &&
                    selectedDate.getMonth() === displayedMonth &&
                    selectedDate.getDate() === dayNumber;

                  const isToday =
                    new Date().getFullYear() === displayedYear &&
                    new Date().getMonth() === displayedMonth &&
                    new Date().getDate() === dayNumber;

                  const disabled = isDayDisabled(dayNumber);

                  return (
                    <TouchableOpacity
                      key={`day-${dayNumber}`}
                      style={[
                        styles.dayCell,
                        isToday && !isSelected && styles.dayCellToday,
                        isSelected && styles.dayCellSelected,
                        disabled && styles.dayCellDisabled,
                      ]}
                      onPress={() => handleSelectDay(dayNumber)}
                      disabled={disabled}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday && !isSelected && styles.dayTextToday,
                          isSelected && styles.dayTextSelected,
                          disabled && styles.dayTextDisabled,
                        ]}
                      >
                        {dayNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Barra de Botones Inferiores: Hoy, Cancelar y Aceptar */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={handleSelectToday}
              activeOpacity={0.7}
            >
              <Text style={styles.todayButtonText}>Hoy</Text>
            </TouchableOpacity>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmButtonText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedDateHeadline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0E5C3A',
    marginTop: 4,
  },
  selectorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4EDE7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#C6E3D1',
  },
  selectorPillActive: {
    backgroundColor: '#0F613B',
    borderColor: '#0F613B',
  },
  selectorPillText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F613B',
  },
  selectorPillTextActive: {
    color: '#FFFFFF',
  },
  arrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  arrowButtonDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.4,
  },
  calendarContainer: {
    minHeight: 250,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDayCell: {
    width: `${100 / 7}%`,
    height: 38,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    marginVertical: 2,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#0F613B',
  },
  dayCellSelected: {
    backgroundColor: '#0F613B',
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1F2937',
  },
  dayTextToday: {
    color: '#0F613B',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  yearViewContainer: {
    height: 250,
  },
  monthViewContainer: {
    height: 250,
  },
  subviewHint: {
    fontSize: 12.5,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  yearScroll: {
    flex: 1,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  yearChip: {
    width: '31%',
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  yearChipActive: {
    backgroundColor: '#0F613B',
    borderColor: '#0F613B',
  },
  yearChipText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#374151',
  },
  yearChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthChip: {
    width: '31%',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthChipActive: {
    backgroundColor: '#0F613B',
    borderColor: '#0F613B',
  },
  monthChipDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.4,
  },
  monthChipText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#374151',
  },
  monthChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  monthChipTextDisabled: {
    color: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  todayButtonText: {
    fontSize: 14,
    color: '#0F613B',
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#0F613B',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
