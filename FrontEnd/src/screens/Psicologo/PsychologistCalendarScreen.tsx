import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PsychologistBottomNav,
  PsychologistTab,
} from '../../components/PsychologistBottomNav';
import { DatePickerModal } from '../../components/DatePickerModal';
import { appointmentService } from '../../services/appointmentService';
import { AppointmentSession } from '../../types/patient';

interface PsychologistCalendarScreenProps {
  doctorName?: string;
  onNavigateTab: (tab: PsychologistTab) => void;
  onSelectPatientById?: (patientId: number) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const HOURS_LIST = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

/**
 * Formatea una fecha en formato local 'YYYY-MM-DD'
 */
const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Retorna los 7 días (Lunes a Domingo) de la semana que contiene a baseDate
 */
const getWeekDays = (baseDate: Date) => {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const day = d.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const week: {
    dateStr: string;
    dayNum: number;
    dayName: string;
    isToday: boolean;
    dateObj: Date;
  }[] = [];
  const todayStr = formatLocalDate(new Date());

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(dayDate);
    week.push({
      dateStr,
      dayNum: dayDate.getDate(),
      dayName: DAY_LABELS[dayDate.getDay()],
      isToday: dateStr === todayStr,
      dateObj: dayDate,
    });
  }
  return week;
};

const formatFullDateSpanish = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dayFullName = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
  ][d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()];
  return `${dayFullName}, ${d.getDate()} de ${monthName}`;
};

export const PsychologistCalendarScreen: React.FC<PsychologistCalendarScreenProps> = ({
  doctorName = 'Especialista',
  onNavigateTab,
}) => {
  const insets = useSafeAreaInsets();

  // Fecha base para la semana y fecha seleccionada (por defecto: HOY)
  const todayDate = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => formatLocalDate(todayDate), [todayDate]);

  const [baseDate, setBaseDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => formatLocalDate(new Date()));

  const [appointments, setAppointments] = useState<AppointmentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMonthPickerModal, setShowMonthPickerModal] = useState(false);

  // Calcula los 7 días de la semana visible
  const weekDays = useMemo(() => getWeekDays(baseDate), [baseDate]);

  // Mes y año de referencia para la cabecera (usando el día seleccionado o la base)
  const activeDateObj = useMemo(() => {
    const parts = selectedDateStr.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return baseDate;
  }, [selectedDateStr, baseDate]);

  const currentYear = activeDateObj.getFullYear();
  const currentMonth = activeDateObj.getMonth();

  // Meses involucrados en la semana para consultar citas completas
  const monthsInWeek = useMemo(() => {
    const set = new Set<string>();
    weekDays.forEach((w) => {
      const monthStr = w.dateStr.slice(0, 7); // 'YYYY-MM'
      set.add(monthStr);
    });
    return Array.from(set);
  }, [weekDays]);

  // Cargar citas para los meses cubiertos por la semana visible
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const allResults: AppointmentSession[] = [];
      for (const m of monthsInWeek) {
        const data = await appointmentService.getPsychologistCalendar({ month: m });
        allResults.push(...data);
      }

      // Eliminar duplicados si alguna cita coincidió
      const uniqueMap = new Map<string, AppointmentSession>();
      allResults.forEach((apt) => uniqueMap.set(apt.id, apt));
      setAppointments(Array.from(uniqueMap.values()));
    } catch (err) {
      console.warn('Error al cargar citas de la semana:', err);
    } finally {
      setLoading(false);
    }
  }, [monthsInWeek]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  // Navegación de semana anterior y posterior
  const handlePrevWeek = () => {
    setBaseDate((prev) => {
      const nextDate = new Date(prev);
      nextDate.setDate(prev.getDate() - 7);
      // Actualizar el día seleccionado al mismo día de la semana anterior
      const selectedParts = selectedDateStr.split('-');
      if (selectedParts.length === 3) {
        const sel = new Date(Number(selectedParts[0]), Number(selectedParts[1]) - 1, Number(selectedParts[2]));
        sel.setDate(sel.getDate() - 7);
        setSelectedDateStr(formatLocalDate(sel));
      }
      return nextDate;
    });
  };

  const handleNextWeek = () => {
    setBaseDate((prev) => {
      const nextDate = new Date(prev);
      nextDate.setDate(prev.getDate() + 7);
      // Actualizar el día seleccionado al mismo día de la semana siguiente
      const selectedParts = selectedDateStr.split('-');
      if (selectedParts.length === 3) {
        const sel = new Date(Number(selectedParts[0]), Number(selectedParts[1]) - 1, Number(selectedParts[2]));
        sel.setDate(sel.getDate() + 7);
        setSelectedDateStr(formatLocalDate(sel));
      }
      return nextDate;
    });
  };

  // Botón rápido para volver a HOY
  const handleGoToToday = () => {
    const now = new Date();
    setBaseDate(now);
    setSelectedDateStr(formatLocalDate(now));
  };

  // Selección directa desde el modal de calendario completo
  const handleSelectCustomDate = (formattedDate: string, dateObj: Date) => {
    setSelectedDateStr(formattedDate);
    setBaseDate(dateObj);
    setShowMonthPickerModal(false);
  };

  // Fechas que tienen citas
  const datesWithAppointments = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((a) => {
      if (a.fecha) set.add(a.fecha);
    });
    return set;
  }, [appointments]);

  // Citas del día actualmente seleccionado
  const dayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.fecha === selectedDateStr)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [appointments, selectedDateStr]);

  // Mapeo de citas por hora para la vista de timeline
  const appointmentsByHour = useMemo(() => {
    const map: Record<string, AppointmentSession[]> = {};
    dayAppointments.forEach((apt) => {
      const hourPrefix = apt.hora.slice(0, 2) + ':00';
      if (!map[hourPrefix]) map[hourPrefix] = [];
      map[hourPrefix].push(apt);
    });
    return map;
  }, [dayAppointments]);

  const isCurrentSelectionToday = selectedDateStr === todayDateStr;

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra Superior */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTag}>CALENDARIO CLÍNICO</Text>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {doctorName}
          </Text>
        </View>

        <View style={styles.topBarActions}>
          {/* Botón rápido "Hoy" */}
          {!isCurrentSelectionToday && (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={handleGoToToday}
              activeOpacity={0.8}
            >
              <Ionicons name="today-outline" size={14} color="#0F613B" style={{ marginRight: 4 }} />
              <Text style={styles.todayButtonText}>Hoy</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 85 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F613B']} />
        }
      >
        {/* Selector de Mes Desplegable */}
        <View style={styles.weekNavHeader}>
          <TouchableOpacity
            style={styles.monthDropdownButton}
            onPress={() => setShowMonthPickerModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={17} color="#0F613B" style={{ marginRight: 6 }} />
            <Text style={styles.monthDropdownText}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <Ionicons name="chevron-down" size={15} color="#4B5563" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Fila de los 7 días de la semana (Lunes a Domingo) */}
        <View style={styles.weekStripContainer}>
          {weekDays.map((day) => {
            const isSelected = selectedDateStr === day.dateStr;
            const hasApts = datesWithAppointments.has(day.dateStr);

            return (
              <TouchableOpacity
                key={day.dateStr}
                style={[
                  styles.dayCard,
                  isSelected && styles.dayCardActive,
                  day.isToday && !isSelected && styles.dayCardToday,
                ]}
                onPress={() => setSelectedDateStr(day.dateStr)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayNameText,
                    isSelected && styles.dayNameTextActive,
                    day.isToday && !isSelected && styles.dayNameTextToday,
                  ]}
                >
                  {day.dayName}
                </Text>

                <Text
                  style={[
                    styles.dayNumText,
                    isSelected && styles.dayNumTextActive,
                    day.isToday && !isSelected && styles.dayNumTextToday,
                  ]}
                >
                  {day.dayNum}
                </Text>

                {/* Indicador de citas o badge de hoy */}
                <View style={styles.indicatorsRow}>
                  {hasApts ? (
                    <View
                      style={[
                        styles.dotIndicator,
                        isSelected && styles.dotIndicatorActive,
                      ]}
                    />
                  ) : day.isToday && !isSelected ? (
                    <View style={styles.todaySmallDot} />
                  ) : (
                    <View style={styles.dotPlaceholder} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Resumen del Día Seleccionado */}
        <View style={styles.daySummaryBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.daySummaryFullDate}>
              {formatFullDateSpanish(selectedDateStr)}
            </Text>
          </View>

          <View style={styles.daySummaryBadge}>
            <Text style={styles.daySummaryBadgeText}>
              {dayAppointments.length} {dayAppointments.length === 1 ? 'sesión' : 'sesiones'}
            </Text>
          </View>
        </View>

        {/* Timeline del Día Seleccionado */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0F613B" />
            <Text style={styles.loadingText}>Cargando agenda de la semana...</Text>
          </View>
        ) : dayAppointments.length === 0 ? (
          <View style={styles.emptyDayContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="time-outline" size={32} color="#0F613B" />
            </View>
            <Text style={styles.emptyTitle}>Sin sesiones programadas</Text>
            <Text style={styles.emptySubtitle}>
              No hay citas agendadas para el {formatFullDateSpanish(selectedDateStr)}. Puedes agendar nuevas sesiones directamente desde la ficha de cada paciente.
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {HOURS_LIST.map((hour) => {
              const aptsAtHour = appointmentsByHour[hour] || [];

              return (
                <View key={hour} style={styles.timelineRow}>
                  {/* Etiqueta horaria */}
                  <View style={styles.hourCol}>
                    <Text style={styles.hourText}>{hour}</Text>
                  </View>

                  {/* Línea divisoria y contenido de sesiones */}
                  <View style={styles.eventsCol}>
                    <View style={styles.hourDivider} />

                    {aptsAtHour.map((apt) => (
                      <View
                        key={apt.id}
                        style={[
                          styles.sessionCard,
                          apt.modalidad === 'online' ? styles.sessionCardOnline : styles.sessionCardPresencial,
                        ]}
                      >
                        {/* Cabecera de la cita */}
                        <View style={styles.sessionHeaderRow}>
                          <View style={styles.timeDurationPill}>
                            <Ionicons name="time" size={13} color="#0F613B" style={{ marginRight: 4 }} />
                            <Text style={styles.timeDurationText}>
                              {apt.hora} {apt.horaFin ? `- ${apt.horaFin}` : ''} ({apt.duracion} min)
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.modalityBadge,
                              apt.modalidad === 'online' ? styles.modalityBadgeOnline : styles.modalityBadgePresencial,
                            ]}
                          >
                            <Ionicons
                              name={apt.modalidad === 'online' ? 'videocam' : 'business'}
                              size={12}
                              color={apt.modalidad === 'online' ? '#2563EB' : '#0F613B'}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.modalityBadgeText,
                                apt.modalidad === 'online' ? styles.modalityBadgeTextOnline : styles.modalityBadgeTextPresencial,
                              ]}
                            >
                              {apt.modalidad === 'online' ? 'Online' : 'Presencial'}
                            </Text>
                          </View>
                        </View>

                        {/* Nombre del Paciente */}
                        <Text style={styles.patientNameText}>
                          {apt.paciente_nombre || 'Paciente'}
                        </Text>

                        {/* Observaciones */}
                        {apt.observaciones ? (
                          <View style={styles.notesRow}>
                            <Ionicons
                              name="document-text-outline"
                              size={13}
                              color="#4B5563"
                              style={{ marginRight: 4, marginTop: 1 }}
                            />
                            <Text style={styles.notesText} numberOfLines={2}>
                              {apt.observaciones}
                            </Text>
                          </View>
                        ) : null}

                        {/* Estado */}
                        <View style={styles.sessionFooterRow}>
                          <View
                            style={[
                              styles.statusPill,
                              apt.estado === 'Completada' ? styles.statusPillCompleted : styles.statusPillScheduled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                apt.estado === 'Completada' ? styles.statusPillTextCompleted : styles.statusPillTextScheduled,
                              ]}
                            >
                              {apt.estado}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Desplegable con Cuadrícula Completa de Mes */}
      <DatePickerModal
        visible={showMonthPickerModal}
        title="Seleccionar Fecha en el Calendario"
        initialDate={selectedDateStr}
        onClose={() => setShowMonthPickerModal(false)}
        onSelectDate={handleSelectCustomDate}
      />

      {/* Barra de Navegación Inferior */}
      <PsychologistBottomNav
        activeTab="calendario"
        onChangeTab={onNavigateTab}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  topBarTag: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F613B',
    letterSpacing: 0.8,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F613B',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  weekNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  monthDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthDropdownText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  weekStripContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  dayCard: {
    flex: 1,
    maxWidth: 48,
    height: 68,
    borderRadius: 13,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  dayCardActive: {
    backgroundColor: '#0F613B',
    borderColor: '#0F613B',
    shadowColor: '#0F613B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCardToday: {
    borderColor: '#0F613B',
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 3,
  },
  dayNameTextActive: {
    color: '#D1FAE5',
  },
  dayNameTextToday: {
    color: '#0F613B',
    fontWeight: '700',
  },
  dayNumText: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#111827',
  },
  dayNumTextActive: {
    color: '#FFFFFF',
  },
  dayNumTextToday: {
    color: '#0F613B',
  },
  indicatorsRow: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  dotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0F613B',
  },
  dotIndicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  todaySmallDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  dotPlaceholder: {
    width: 5,
    height: 5,
  },
  daySummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
  },
  daySummaryFullDate: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  todayLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F613B',
    marginTop: 1,
  },
  daySummaryBadge: {
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  daySummaryBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F613B',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyDayContainer: {
    margin: 20,
    padding: 28,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  timelineContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  hourCol: {
    width: 48,
    paddingTop: 2,
  },
  hourText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
  },
  eventsCol: {
    flex: 1,
    paddingLeft: 8,
  },
  hourDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  sessionCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sessionCardPresencial: {
    borderLeftColor: '#0F613B',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  sessionCardOnline: {
    borderLeftColor: '#2563EB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeDurationText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#374151',
  },
  modalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalityBadgePresencial: {
    backgroundColor: '#EAF5EE',
  },
  modalityBadgeOnline: {
    backgroundColor: '#EFF6FF',
  },
  modalityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalityBadgeTextPresencial: {
    color: '#0F613B',
  },
  modalityBadgeTextOnline: {
    color: '#2563EB',
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  sessionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillScheduled: {
    backgroundColor: '#FEF3C7',
  },
  statusPillCompleted: {
    backgroundColor: '#EAF5EE',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  statusPillTextScheduled: {
    color: '#92400E',
  },
  statusPillTextCompleted: {
    color: '#0F613B',
  },
});
