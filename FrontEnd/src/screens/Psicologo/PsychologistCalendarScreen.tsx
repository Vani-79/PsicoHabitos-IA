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
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { AppointmentSession } from '../../types/patient';
import { formatToChileanDate } from '../../utils/date';
import { PSYCHOLOGIST_COLORS } from './psychologistColors';

const CALENDAR_COLORS = PSYCHOLOGIST_COLORS.calendario;

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
  if (parts.length !== 3) return formatToChileanDate(dateStr) || dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dayFullName = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
  ][d.getDay()];
  const monthName = MONTH_NAMES[d.getMonth()];
  return `${dayFullName}, ${d.getDate()} de ${monthName} de ${d.getFullYear()} (${formatToChileanDate(dateStr)})`;
};

const parseEntryDate = (dateStr?: string): Date | null => {
  if (!dateStr || dateStr === 'No registrada') return null;
  let y = 0;
  let m = 0;
  let d = 1;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(Number);
    if (parts.length === 3) {
      d = parts[0];
      m = parts[1] - 1;
      y = parts[2];
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3) {
      y = parts[0];
      m = parts[1] - 1;
      d = parts[2];
    }
  }
  if (y > 1900 && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
    const parsed = new Date(y, m, d);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

export const PsychologistCalendarScreen: React.FC<PsychologistCalendarScreenProps> = ({
  doctorName = 'Especialista',
  onNavigateTab,
  onSelectPatientById,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();



  // Fecha del primer ingreso del psicólogo en la app
  const [minCalendarDate, setMinCalendarDate] = useState<Date | null>(() => {
    return parseEntryDate(user?.fechaIngreso);
  });

  useEffect(() => {
    let isMounted = true;
    const fetchEntryDate = async () => {
      try {
        const profile = await authService.getPsychologistProfile();
        if (isMounted && profile?.fechaIngreso) {
          const parsed = parseEntryDate(profile.fechaIngreso);
          if (parsed) {
            setMinCalendarDate(parsed);
          }
        }
      } catch (err) {
        console.warn('[PsychologistCalendarScreen] Error obteniendo fecha de ingreso:', err);
      }
    };
    void fetchEntryDate();
    return () => {
      isMounted = false;
    };
  }, []);



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
      const resultsByMonth = await Promise.all(
        monthsInWeek.map((m) => appointmentService.getPsychologistCalendar({ month: m }))
      );
      const allResults = resultsByMonth.flat();


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
    void fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
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


  // Fechas que tienen citas (para los puntos en el calendario mensual)
  const datesWithAppointments = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((a) => {
      if (a.fecha && a.estado !== 'Cancelada') {
        set.add(a.fecha);
      }
    });
    return set;
  }, [appointments]);


  // Citas del día actualmente seleccionado (solo citas activas / no canceladas)
  const dayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.fecha === selectedDateStr && a.estado !== 'Cancelada')
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

  const getStatusPillStyle = (estado: string) => {
    if (estado === 'Completada') return styles.statusPillCompleted;
    if (estado === 'Cancelada') return styles.statusPillCancelled;
    return styles.statusPillScheduled;
  };

  const getStatusTextStyle = (estado: string) => {
    if (estado === 'Completada') return styles.statusPillTextCompleted;
    if (estado === 'Cancelada') return styles.statusPillTextCancelled;
    return styles.statusPillTextScheduled;
  };

  const renderTimelineContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={CALENDAR_COLORS.primary} />
          <Text style={styles.loadingText}>Cargando agenda de la semana...</Text>
        </View>
      );
    }

    if (dayAppointments.length === 0) {
      return (
        <View style={styles.emptyDayContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="time-outline" size={32} color={CALENDAR_COLORS.iconosPerfil} />
          </View>
          <Text style={styles.emptyTitle}>Sin sesiones programadas</Text>
          <Text style={styles.emptySubtitle}>
            No hay citas agendadas para el {formatToChileanDate(selectedDateStr)}. Puedes agendar nuevas sesiones directamente desde la ficha de cada paciente.
          </Text>
        </View>
      );
    }

    return (
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

                {aptsAtHour.map((apt) => {
                  const isClickable = Boolean(apt.paciente_id && onSelectPatientById);

                  return (
                    <TouchableOpacity
                      key={apt.id}
                      activeOpacity={isClickable ? 0.7 : 1}
                      disabled={!isClickable}
                      onPress={() => {
                        if (apt.paciente_id && onSelectPatientById) {
                          onSelectPatientById(apt.paciente_id);
                        }
                      }}
                      style={[
                        styles.sessionCard,
                        apt.modalidad === 'online' ? styles.sessionCardOnline : styles.sessionCardPresencial,
                      ]}
                    >

                      {/* Cabecera de la cita */}
                      <View style={styles.sessionHeaderRow}>
                        <View style={styles.timeDurationPill}>
                          <Ionicons name="time" size={13} color={CALENDAR_COLORS.iconosPerfil} style={{ marginRight: 4 }} />
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
                            color={apt.modalidad === 'online' ? CALENDAR_COLORS.iconosPerfil : CALENDAR_COLORS.iconosPerfil}
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


                      {/* Nombre del Paciente con recordatorio de Suplencia si aplica */}
                      <View style={styles.patientRowWithBadge}>
                        <Text
                          style={[
                            styles.patientNameText,
                            apt.estado === 'Cancelada' && styles.patientNameCancelled,
                          ]}
                        >
                          {apt.paciente_nombre || 'Paciente'}
                        </Text>
                        {apt.rol_psicologo === 'suplente' && (
                          <View style={styles.suplenteRoleBadge}>
                            <Ionicons name="repeat" size={11} color={CALENDAR_COLORS.info} style={{ marginRight: 3 }} />
                            <Text style={styles.suplenteRoleBadgeText}>Suplencia</Text>
                          </View>
                        )}
                        {isClickable && (
                          <Ionicons
                            name="chevron-forward"
                            size={15}
                            color={CALENDAR_COLORS.iconosPerfil}
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </View>


                      {/* Observaciones */}
                      {apt.observaciones ? (
                        <View style={styles.notesRow}>
                          <Ionicons
                            name="document-text-outline"
                            size={13}
                            color={CALENDAR_COLORS.textSecondary}
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
                            getStatusPillStyle(apt.estado),
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              getStatusTextStyle(apt.estado),
                            ]}
                          >
                            {apt.estado}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra Superior */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTag}>CALENDARIO CLÍNICO</Text>
        </View>

        <View style={styles.topBarActions}>
          {/* Botón rápido "Hoy" */}
          {!isCurrentSelectionToday && (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={handleGoToToday}
              activeOpacity={0.8}
            >
              <Ionicons name="today-outline" size={14} color={CALENDAR_COLORS.iconosPerfil} style={{ marginRight: 4 }} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[CALENDAR_COLORS.primary]} />
        }
      >

        {/* Selector de Mes Desplegable */}
        <View style={styles.weekNavHeader}>
          <TouchableOpacity
            style={styles.monthDropdownButton}
            onPress={() => setShowMonthPickerModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={17} color={CALENDAR_COLORS.iconosPerfil} style={{ marginRight: 6 }} />
            <Text style={styles.monthDropdownText}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <Ionicons name="chevron-down" size={17} color={CALENDAR_COLORS.iconosPerfil} style={{ marginLeft: 10 }} />
          </TouchableOpacity>
        </View>


        {/* Fila de los 7 días de la semana (Lunes a Domingo) */}
        <View style={styles.weekStripContainer}>
          {weekDays.map((day) => {
            const isSelected = selectedDateStr === day.dateStr;
            const hasApts = datesWithAppointments.has(day.dateStr);
            const isDayDisabled = minCalendarDate
              ? day.dateObj < new Date(minCalendarDate.getFullYear(), minCalendarDate.getMonth(), minCalendarDate.getDate())
              : false;

            let dayIndicator = <View style={styles.dotPlaceholder} />;
            if (hasApts) {
              dayIndicator = (
                <View
                  style={[
                    styles.dotIndicator,
                    isSelected && styles.dotIndicatorActive,
                  ]}
                />
              );
            } 

            return (
              <TouchableOpacity
                key={day.dateStr}
                style={[
                  styles.dayCard,
                  isSelected && styles.dayCardActive,
                  day.isToday && !isSelected && styles.dayCardToday,
                  isDayDisabled && styles.dayCardDisabled,
                ]}
                onPress={() => setSelectedDateStr(day.dateStr)}
                disabled={isDayDisabled}
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
                  {dayIndicator}
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
        {renderTimelineContent()}
      </ScrollView>


      {/* Modal Desplegable con Cuadrícula Completa de Mes (bloqueando años anteriores al ingreso) */}
      <DatePickerModal
        visible={showMonthPickerModal}
        title="Seleccionar Fecha en el Calendario"
        initialDate={selectedDateStr}
        minDate={minCalendarDate || new Date(new Date().getFullYear(), 0, 1)}
        yearOrder="asc"
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

// ESTILOS DE CALENDARIO

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CALENDAR_COLORS.fondoBase,
  },

   //COMIENZO DE CALENDARIO SIN CITA

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: CALENDAR_COLORS.fondoBase,
  },

  topBarTag: {
    fontSize: 13,
    fontWeight: '600',
    color: CALENDAR_COLORS.textoPrincipal,
    letterSpacing: 0.6,
  },

  
  topBarActions: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CALENDAR_COLORS.fondoiconos,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CALENDAR_COLORS.bordeIconos,
  },

  todayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: CALENDAR_COLORS.textoSecundario,
  },

  scrollContent: {
    flexGrow: 1,
  },

  weekNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 0,
    backgroundColor: CALENDAR_COLORS.fondoBase,
  },

  dayCardDisabled: {
    opacity: 0.35,
    backgroundColor: CALENDAR_COLORS.surfaceMuted,
  },

  monthDropdownButton: {
  
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CALENDAR_COLORS.fondoiconos,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CALENDAR_COLORS.bordeIconos,
    marginBottom: 10,
  },

  monthDropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: CALENDAR_COLORS.textoSecundario,
  },

  weekStripContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: CALENDAR_COLORS.fondoBase,
  },

  dayCard: {
    flex: 1,
    maxWidth: 48,
    height: 60,
    borderRadius: 10,
    backgroundColor: CALENDAR_COLORS.fondoiconos,
    borderWidth: 1,
    borderColor: CALENDAR_COLORS.bordeIconos,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginHorizontal: 3,
  },

  dayCardActive: {
    backgroundColor: CALENDAR_COLORS.iconosPerfil,
    borderColor: CALENDAR_COLORS.bordeIconos,    
    elevation: 1,
  },

  dayCardToday: {
    borderColor: CALENDAR_COLORS.iconosPerfil,
    borderWidth: 1.5,
    backgroundColor: CALENDAR_COLORS.fondoiconos,
  },

  dayNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: CALENDAR_COLORS.textoSecundario,
    marginBottom: 3,
  },

  dayNameTextActive: {
    color: CALENDAR_COLORS.textoBlanco,
  },

  dayNameTextToday: {
    color: CALENDAR_COLORS.iconosPerfil,
    fontWeight: '800',
  },

  dayNumText: {
    fontSize: 15,
    fontWeight: '600',
    color: CALENDAR_COLORS.textoSecundario,
  },

  dayNumTextActive: {
    color: CALENDAR_COLORS.textoBlanco,
  },
  
  dayNumTextToday: {
    color: CALENDAR_COLORS.iconosPerfil,
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
    backgroundColor: CALENDAR_COLORS.iconosPerfil,
  },

  dotIndicatorActive: {
    backgroundColor: CALENDAR_COLORS.surface,
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
    paddingVertical: 0,
    backgroundColor: CALENDAR_COLORS.fondoBase,
  },

  daySummaryFullDate: {
    marginTop: 20,
    fontSize: 12,
    fontWeight: '700',
    color: CALENDAR_COLORS.textoSecundario,
  },

  daySummaryBadge: {
    marginTop: 20,
    backgroundColor: CALENDAR_COLORS.fondoiconos,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CALENDAR_COLORS.bordeIconos,
  },

  daySummaryBadgeText: {   
    fontSize: 12,
    fontWeight: '600',
    color: CALENDAR_COLORS.iconosPerfil,
  },

  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: CALENDAR_COLORS.textMuted,
  },

  emptyDayContainer: {
    margin: 20,
    padding: 28,
    borderRadius: 14,
    backgroundColor: CALENDAR_COLORS.fondoiconos,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CALENDAR_COLORS.bordeIconos,
  },

  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: CALENDAR_COLORS.fondoiconos,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: CALENDAR_COLORS.textoPrincipal,
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 13,
    color: CALENDAR_COLORS.textoSecundario,
    textAlign: 'center',
    lineHeight: 19,
  },


  //FIN DE CALENDARIO SIN CITA



  //INICIO DE CALENDARIO CON CITA

  timelineContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },

  timelineRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  hourCol: {
    width: 40,
    paddingTop: 0,
  },
  
  hourText: {
    fontSize: 12,
    fontWeight: '600',
    color: CALENDAR_COLORS.textoSecundario,
  },

  eventsCol: {
    flex: 1,
    paddingLeft: 4,
  },

  hourDivider: {
    height: 1,
    backgroundColor: CALENDAR_COLORS.bordeIconos,
    marginBottom: 10,
  },

  sessionCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    backgroundColor: CALENDAR_COLORS.fondoBase,
    borderLeftWidth: 4,  
    elevation: 1,
  },

  sessionCardPresencial: {
    borderLeftColor: CALENDAR_COLORS.iconosPerfil,
    borderColor: CALENDAR_COLORS.iconosPerfil,
    borderWidth: 1,
  },

  sessionCardOnline: {
    borderLeftColor: CALENDAR_COLORS.iconosPerfil,
    borderColor: CALENDAR_COLORS.iconosPerfil,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    
  },

  timeDurationText: {
    fontSize: 12,
    fontWeight: '600',
    color: CALENDAR_COLORS.textoHora,
  },

  modalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  
  modalityBadgePresencial: {
    backgroundColor: CALENDAR_COLORS.fondoiconos,
  },

  modalityBadgeOnline: {
    backgroundColor: CALENDAR_COLORS.fondoiconos,
  },

  modalityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  modalityBadgeTextPresencial: {
    color: CALENDAR_COLORS.iconosPerfil,
  },

  modalityBadgeTextOnline: {
    color: CALENDAR_COLORS.iconosPerfil,
  },

  patientRowWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },

  patientNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: CALENDAR_COLORS.textoSecundario,
    flex: 1,
  },

  patientNameCancelled: {
    color: CALENDAR_COLORS.textoSecundario,
    textDecorationLine: 'line-through',
  },

  suplenteRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CALENDAR_COLORS.infoSurface,
    borderWidth: 1,
    borderColor: CALENDAR_COLORS.infoBorder,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },

  suplenteRoleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: CALENDAR_COLORS.info,
  },

  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: CALENDAR_COLORS.surfaceSubtle,
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 6,
  },

  notesText: {
    flex: 1,
    fontSize: 12,
    color: CALENDAR_COLORS.textoSecundario,
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
    backgroundColor: CALENDAR_COLORS.fondoiconos,
  },

  statusPillCompleted: {
    backgroundColor: CALENDAR_COLORS.fondoiconos,
  },

  statusPillCancelled: {
    backgroundColor: CALENDAR_COLORS.fondoiconos,
  },

  statusPillText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  statusPillTextScheduled: {
    color: CALENDAR_COLORS.estadoReagendar,
  },
  statusPillTextCompleted: {
    color: CALENDAR_COLORS.estadoCompletada,
  },
  statusPillTextCancelled: {
    color: CALENDAR_COLORS.estadoCancelada,
  },
});
