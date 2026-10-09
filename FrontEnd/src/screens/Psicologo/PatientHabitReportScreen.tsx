import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LineChart } from 'react-native-gifted-charts';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PsychologistStackParamList, HabitReportFilters, HabitPeriod } from '../../navigation/types';
import { HabitKey, MySqlDailyHabitRecord } from '../../types/habits';
import { MySqlPatientRecord } from '../../types/patient';
import { habitService } from '../../services/habitService';
import { appointmentService } from '../../services/appointmentService';
import { HabitFilterModal } from '../../components/HabitFilterModal';
import { formatToChileanDate } from '../../utils/date';
import { getRatingLabel } from '../../constants/habits';

type Props = NativeStackScreenProps<PsychologistStackParamList, 'PatientHabitReport'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HABIT_CONFIG: Record<
  HabitKey,
  { label: string; color: string; areaColor: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  comida: { label: 'Comida', color: '#D97706', areaColor: '#FEF3C7', icon: 'restaurant-outline' },
  ejercicio: { label: 'Ejercicio', color: '#16A34A', areaColor: '#DCFCE7', icon: 'barbell-outline' },
  hidratacion: { label: 'Hidratación', color: '#0284C7', areaColor: '#E0F2FE', icon: 'water-outline' },
  sueno: { label: 'Sueño', color: '#7C3AED', areaColor: '#EDE9FE', icon: 'moon-outline' },
  ansiedad: { label: 'Ansiedad', color: '#E11D48', areaColor: '#FFE4E6', icon: 'pulse-outline' },
  estres: { label: 'Estrés', color: '#2563EB', areaColor: '#DBEAFE', icon: 'flash-outline' },
};

const PERIOD_LABELS: Record<HabitPeriod, string> = {
  therapy_start: 'Inicio de terapia',
  week: 'Última semana (7 días)',
  month: 'Último mes (30 días)',
  '3months': 'Últimos 3 meses (90 días)',
  '6months': 'Últimos 6 meses',
  year: 'El último año',
  custom: 'Rango personalizado',
  day: 'Día específico',
};

const PERIOD_DAYS_MAP: Partial<Record<HabitPeriod, number>> = {
  week: 7,
  month: 30,
  '3months': 90,
  '6months': 180,
  year: 365,
};

const Y_AXIS_RATING_MAPS: Partial<Record<HabitKey, Record<number, string>>> = {
  ansiedad: { 1: 'Muy intensa', 2: 'Intensa', 3: 'Moderada', 4: 'Leve', 5: 'En calma' },
  estres: { 1: 'Muy intenso', 2: 'Intenso', 3: 'Moderado', 4: 'Leve', 5: 'En calma' },
};

const DEFAULT_Y_RATING_MAP: Record<number, string> = {
  1: 'Muy mal',
  2: 'Mal',
  3: 'Regular',
  4: 'Bien',
  5: 'Muy bien',
};

const Y_AXIS_LABEL_MAP: Partial<Record<HabitKey, string[]>> = {
  ansiedad: [' ', 'Muy intensa', 'Intensa', 'Moderada', 'Leve', 'En calma'],
  estres: [' ', 'Muy intenso', 'Intenso', 'Moderado', 'Leve', 'En calma'],
  hidratacion: [' ', '1 L', '2 L', '3 L', '4 L', '5 L'],
};

const DEFAULT_Y_AXIS_LABELS = [' ', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CHART_Y_AXIS_TEXT_STYLE = {
  fontSize: 8.5,
  color: '#64748B',
  fontWeight: '600' as const,
};

// Helper para obtener string de fecha local YYYY-MM-DD sin desfaces de zona horaria
const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Formatear hora simple HH:MM a partir de DATETIME 'YYYY-MM-DD HH:MM:SS'
const formatTimeOnly = (dateTimeStr?: string | null): string => {
  if (!dateTimeStr) return '--:--';
  const match = /(\d{1,2}:\d{2})/.exec(dateTimeStr);
  return match ? match[1] : '--:--';
};

const getDatePrefix = (dateStr: string): string => dateStr.split('T')[0].split(' ')[0];

const getPatientIdentifier = (patient: MySqlPatientRecord): string => {
  if (patient.email) return patient.email;
  if (patient.id != null) return String(patient.id);
  return '';
};

const fetchPatientAppointments = async (patientId?: number) => {
  if (!patientId) return [];
  try {
    return await appointmentService.getPatientAppointments(patientId);
  } catch {
    return [];
  }
};

const extractSessionDate = (a: any): string | null => {
  const rawDate = a.fecha || a.fecha_hora_inicio;
  return rawDate ? getDatePrefix(rawDate) : null;
};

const calculateFirstSessionDate = (
  appointmentsData: any[] | null | undefined,
  patient: MySqlPatientRecord,
  todayStr: string
): string | null => {
  if (appointmentsData && appointmentsData.length > 0) {
    const sessionDates = appointmentsData
      .map(extractSessionDate)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => a.localeCompare(b));

    if (sessionDates.length > 0) {
      const pastOrToday = sessionDates.filter((d) => d <= todayStr);
      return pastOrToday.length > 0 ? pastOrToday[0] : sessionDates[0];
    }
  }

  const fallback = patient.fecha_primera_sesion || patient.created_at;
  return fallback ? getDatePrefix(fallback) : null;
};

const getEffectiveTherapyStartDate = (
  firstSessionDate: string | null,
  patient: MySqlPatientRecord,
  rawRecords: MySqlDailyHabitRecord[]
): string | null => {
  const todayStr = getLocalDateString();
  if (firstSessionDate && firstSessionDate <= todayStr) return firstSessionDate;

  if (patient.fecha_primera_sesion) {
    const pDate = getDatePrefix(patient.fecha_primera_sesion);
    if (pDate <= todayStr) return pDate;
  }

  if (rawRecords.length > 0) {
    const sorted = [...rawRecords].sort(
      (a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime()
    );
    return getDatePrefix(sorted[0].evaluation_date);
  }

  if (firstSessionDate) return firstSessionDate;
  if (patient.created_at) return getDatePrefix(patient.created_at);
  return null;
};

const filterRecordsByPeriod = (
  rawRecords: MySqlDailyHabitRecord[],
  filters: HabitReportFilters,
  effectiveTherapyStartDate: string | null
): MySqlDailyHabitRecord[] => {
  if (!rawRecords.length) return [];

  const todayStr = getLocalDateString();

  if (filters.period === 'day') {
    const targetDate = filters.specificDate || filters.startDate || todayStr;
    return rawRecords.filter((r) => getDatePrefix(r.evaluation_date) === targetDate);
  }

  if (filters.period === 'custom') {
    const start = filters.startDate || todayStr;
    const end = filters.endDate || todayStr;
    const minDate = start <= end ? start : end;
    const maxDate = start <= end ? end : start;
    return rawRecords.filter((r) => {
      const recDate = getDatePrefix(r.evaluation_date);
      return recDate >= minDate && recDate <= maxDate;
    });
  }

  if (filters.period === 'therapy_start') {
    if (!effectiveTherapyStartDate) return rawRecords;
    return rawRecords.filter((r) => {
      const recDate = getDatePrefix(r.evaluation_date);
      return recDate >= effectiveTherapyStartDate && recDate <= todayStr;
    });
  }

  const daysToSubtract = PERIOD_DAYS_MAP[filters.period] ?? 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToSubtract);
  const startStr = getLocalDateString(startDate);

  return rawRecords.filter((r) => {
    const recDate = getDatePrefix(r.evaluation_date);
    return recDate >= startStr && recDate <= todayStr;
  });
};

const sortRecordsChronologically = (records: MySqlDailyHabitRecord[]): MySqlDailyHabitRecord[] =>
  [...records].sort(
    (a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime()
  );

const findSelectedRecord = (
  records: MySqlDailyHabitRecord[],
  selectedDate: string | null
): MySqlDailyHabitRecord | null => {
  if (!selectedDate || !records.length) return null;
  return records.find((r) => getDatePrefix(r.evaluation_date) === selectedDate) || null;
};

const calculateDaysDifference = (startStr: string, endStr: string): number => {
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const calculateTotalDaysCount = (
  period: HabitPeriod,
  filters: HabitReportFilters,
  effectiveTherapyStartDate: string | null,
  filteredCount: number
): number => {
  const todayStr = getLocalDateString();
  if (period === 'custom') {
    const start = filters.startDate || todayStr;
    const end = filters.endDate || todayStr;
    const minDate = start <= end ? start : end;
    const maxDate = start <= end ? end : start;
    return calculateDaysDifference(minDate, maxDate);
  }
  if (period === 'therapy_start') {
    return effectiveTherapyStartDate
      ? calculateDaysDifference(effectiveTherapyStartDate, todayStr)
      : filteredCount || 1;
  }
  return PERIOD_DAYS_MAP[period] ?? 1;
};

const calculateAverageConfirmedTime = (records: MySqlDailyHabitRecord[]): string => {
  let sumSin = 0;
  let sumCos = 0;
  let confirmedCount = 0;

  for (const r of records) {
    if (!r.confirmed_at) continue;
    const timeMatch = /(\d{1,2}):(\d{2})/.exec(r.confirmed_at);
    if (!timeMatch) continue;

    const h = Number.parseInt(timeMatch[1], 10);
    const m = Number.parseInt(timeMatch[2], 10);
    const totalMinutes = h * 60 + m;
    const angle = (totalMinutes / 1440) * 2 * Math.PI;
    sumSin += Math.sin(angle);
    sumCos += Math.cos(angle);
    confirmedCount += 1;
  }

  if (confirmedCount === 0) return '--:--';

  let avgAngle = Math.atan2(sumSin, sumCos);
  if (avgAngle < 0) avgAngle += 2 * Math.PI;
  const avgMinutes = Math.round((avgAngle / (2 * Math.PI)) * 1440) % 1440;
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const calculateReportStats = (
  filteredRecords: MySqlDailyHabitRecord[],
  filters: HabitReportFilters,
  effectiveTherapyStartDate: string | null
) => {
  const daysRecorded = filteredRecords.length;
  const totalDaysCount = calculateTotalDaysCount(
    filters.period,
    filters,
    effectiveTherapyStartDate,
    daysRecorded
  );
  const adherenceRate = Math.min(100, Math.round((daysRecorded / totalDaysCount) * 100));

  const totals: Record<HabitKey, number> = {
    comida: 0,
    ejercicio: 0,
    hidratacion: 0,
    sueno: 0,
    ansiedad: 0,
    estres: 0,
  };
  let totalSleepHours = 0;
  let sleepHoursCount = 0;

  filteredRecords.forEach((r) => {
    if (r.comida) totals.comida += Number(r.comida);
    if (r.ejercicio) totals.ejercicio += Number(r.ejercicio);
    if (r.hidratacion) totals.hidratacion += Number(r.hidratacion);
    if (r.sueno) totals.sueno += Number(r.sueno);
    if (r.ansiedad) totals.ansiedad += Number(r.ansiedad);
    if (r.estres) totals.estres += Number(r.estres);
    if (r.sueno_horas) {
      totalSleepHours += Number(r.sueno_horas);
      sleepHoursCount += 1;
    }
  });

  const count = daysRecorded || 1;
  const averages = {
    comida: Number((totals.comida / count).toFixed(1)),
    ejercicio: Number((totals.ejercicio / count).toFixed(1)),
    hidratacion: Number((totals.hidratacion / count).toFixed(1)),
    sueno: Number((totals.sueno / count).toFixed(1)),
    ansiedad: Number((totals.ansiedad / count).toFixed(1)),
    estres: Number((totals.estres / count).toFixed(1)),
    sueno_horas: sleepHoursCount > 0 ? Number((totalSleepHours / sleepHoursCount).toFixed(1)) : 7.0,
  };

  return {
    daysRecorded,
    totalDaysCount,
    adherenceRate,
    averageConfirmedTime: calculateAverageConfirmedTime(filteredRecords),
    averages,
  };
};

const formatYAxisLabel = (label: string, activeHabit: HabitKey): string => {
  const num = Math.round(Number(label));
  if (num <= 0 || num > 5) return ' ';
  if (activeHabit === 'hidratacion') return `${num} L`;
  const map = Y_AXIS_RATING_MAPS[activeHabit] || DEFAULT_Y_RATING_MAP;
  return map[num] || label;
};

const getYAxisLabels = (habit: HabitKey): string[] =>
  Y_AXIS_LABEL_MAP[habit] || DEFAULT_Y_AXIS_LABELS;

const getYAxisLabelWidth = (habit: HabitKey): number => (habit === 'hidratacion' ? 34 : 74);

const calculateDynamicSpacing = (count: number, yAxisWidth: number): number => {
  if (count <= 7) {
    const availableWidth = SCREEN_WIDTH - 60 - yAxisWidth;
    return Math.max(34, Math.floor(availableWidth / Math.max(1, count)));
  }
  return 42;
};

const generateChartData = (
  chronologicalRecords: MySqlDailyHabitRecord[],
  activeChartHabit: HabitKey,
  selectedRecordDate: string | null,
  onSelectDay: (dateStr: string) => void
) => {
  if (!chronologicalRecords.length) return [];

  const baseColor = HABIT_CONFIG[activeChartHabit]?.color || '#1A7A54';
  const labelModulo = Math.max(1, Math.floor(chronologicalRecords.length / 6));

  return chronologicalRecords.map((r, index) => {
    const recDate = getDatePrefix(r.evaluation_date);
    const isSelected = selectedRecordDate === recDate;
    const dateParts = recDate.split('-');
    const dayLabel = `${dateParts[2]}/${dateParts[1]}`;

    let val = Number(r[activeChartHabit] ?? 3);
    if (activeChartHabit === 'hidratacion') val = Math.min(5, val);

    const showLabel = index % labelModulo === 0;

    return {
      value: val,
      label: showLabel ? dayLabel : '',
      dataPointText: '',
      dataPointRadius: isSelected ? 12 : 8,
      dataPointColor: isSelected ? '#0F172A' : baseColor,
      showVerticalLine: isSelected,
      verticalLineColor: '#0F172A40',
      verticalLineThickness: 2,
      verticalLineStrokeDashArray: [4, 4],
      onPress: () => onSelectDay(recDate),
    };
  });
};

const getPeriodFilterText = (
  filters: HabitReportFilters,
  effectiveTherapyStartDate: string | null
): string => {
  if (filters.period === 'day') {
    const d = filters.specificDate || filters.startDate;
    if (d) return `Día: ${formatToChileanDate(d)}`;
  }
  if (filters.period === 'custom' && filters.startDate && filters.endDate) {
    return `Rango: ${formatToChileanDate(filters.startDate)} al ${formatToChileanDate(filters.endDate)}`;
  }
  if (filters.period === 'therapy_start' && effectiveTherapyStartDate) {
    return `Inicio de terapia (${formatToChileanDate(effectiveTherapyStartDate)})`;
  }
  return PERIOD_LABELS[filters.period];
};

const getEmptyPeriodDescription = (
  filters: HabitReportFilters,
  effectiveTherapyStartDate: string | null
): string => {
  if (filters.period === 'day') {
    const d = filters.specificDate || filters.startDate;
    if (d) return formatToChileanDate(d);
  }
  if (filters.period === 'custom' && filters.startDate && filters.endDate) {
    return `${formatToChileanDate(filters.startDate)} al ${formatToChileanDate(filters.endDate)}`;
  }
  if (filters.period === 'therapy_start' && effectiveTherapyStartDate) {
    return `Inicio de terapia (${formatToChileanDate(effectiveTherapyStartDate)})`;
  }
  return PERIOD_LABELS[filters.period];
};

interface HabitCardMetrics {
  displayScore: string;
  percentage: number;
  qualitative: string | null;
  subDetail: string | null;
}

const getSingleDayHabitMetrics = (
  habitKey: HabitKey,
  record: MySqlDailyHabitRecord
): HabitCardMetrics => {
  const rawVal = Number(record[habitKey] ?? 0);

  if (habitKey === 'hidratacion') {
    return {
      displayScore: `${rawVal.toFixed(1)} Litros`,
      percentage: Math.min(100, Math.round((rawVal / 3.0) * 100)),
      qualitative: null,
      subDetail: 'Consumo de la jornada',
    };
  }

  if (habitKey === 'sueno') {
    const hours = record.sueno_horas != null ? `${record.sueno_horas}h` : '7h';
    return {
      displayScore: `${rawVal}/5 (${hours})`,
      percentage: Math.min(100, Math.round((rawVal / 5) * 100)),
      qualitative: getRatingLabel(rawVal, habitKey),
      subDetail: `Registró ${hours} de sueño`,
    };
  }

  return {
    displayScore: `${rawVal}/5`,
    percentage: Math.min(100, Math.round((rawVal / 5) * 100)),
    qualitative: getRatingLabel(rawVal, habitKey),
    subDetail: 'Calificación del día',
  };
};

const getAverageHabitMetrics = (
  habitKey: HabitKey,
  averages: Record<HabitKey, number> & { sueno_horas: number }
): HabitCardMetrics => {
  const avg = averages[habitKey];

  if (habitKey === 'hidratacion') {
    return {
      displayScore: `${avg} L/día`,
      percentage: Math.min(100, Math.round((avg / 3.0) * 100)),
      qualitative: null,
      subDetail: 'Promedio en el período',
    };
  }

  if (habitKey === 'sueno') {
    return {
      displayScore: `${avg}/5 (${averages.sueno_horas}h)`,
      percentage: Math.min(100, Math.round((avg / 5) * 100)),
      qualitative: getRatingLabel(Math.round(avg), habitKey),
      subDetail: `Promedio: ${averages.sueno_horas}h diarias`,
    };
  }

  return {
    displayScore: `${avg}/5`,
    percentage: Math.min(100, Math.round((avg / 5) * 100)),
    qualitative: getRatingLabel(Math.round(avg), habitKey),
    subDetail: 'Promedio en el período',
  };
};

// Subcomponente: Anillo Circular SVG de Adherencia
const AdherenceRing: React.FC<{ percentage: number }> = ({ percentage }) => {
  const size = 68;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1A7A54" />
            <Stop offset="100%" stopColor="#34D399" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringPercentageText}>{percentage}%</Text>
    </View>
  );
};

// Subcomponente: Vista de período sin datos
const EmptyReportCard: React.FC<{
  periodText: string;
  onOpenFilters: () => void;
}> = ({ periodText, onOpenFilters }) => (
  <View style={styles.emptyCard}>
    <View style={styles.emptyIconCircle}>
      <Ionicons name="file-tray-outline" size={36} color="#94A3B8" />
    </View>
    <Text style={styles.emptyTitle}>Sin registros en este período</Text>
    <Text style={styles.emptySubtitle}>
      El paciente no registró check-ins diarios en el rango seleccionado ({periodText}).
    </Text>
    <TouchableOpacity style={styles.emptyActionBtn} onPress={onOpenFilters}>
      <Ionicons name="calendar" size={16} color="#FFFFFF" />
      <Text style={styles.emptyActionBtnText}>Cambiar período de búsqueda</Text>
    </TouchableOpacity>
  </View>
);

// Subcomponente: Tarjetas de Resumen Ejecutivo (KPIs)
interface ReportKpisProps {
  stats: {
    adherenceRate: number;
    daysRecorded: number;
    totalDaysCount: number;
    averageConfirmedTime: string;
  };
  selectedRecord: MySqlDailyHabitRecord | null;
}

const ReportKpis: React.FC<ReportKpisProps> = ({ stats, selectedRecord }) => {
  const isSelected = Boolean(selectedRecord);
  const timeText = isSelected
    ? formatTimeOnly(selectedRecord?.confirmed_at)
    : stats.averageConfirmedTime;
  const timeSublabel = isSelected
    ? `hrs (${formatToChileanDate(selectedRecord!.evaluation_date)})`
    : 'hrs (Promedio)';
  const defaultBadgeText =
    stats.daysRecorded === 1 ? 'Check-in jornada' : 'Hábito habitual';
  const badgeText = isSelected ? 'Check-in seleccionado' : defaultBadgeText;

  return (
    <View style={styles.kpiRow}>
      {/* KPI 1: Adherencia */}
      <View style={styles.kpiCard}>
        <Text style={styles.kpiTitle}>Adherencia</Text>
        <View style={styles.kpiContentCenter}>
          <AdherenceRing percentage={stats.adherenceRate} />
        </View>
        <View style={styles.kpiBadgeGreen}>
          <Text style={styles.kpiBadgeGreenText}>
            {stats.daysRecorded}/{stats.totalDaysCount} días
          </Text>
        </View>
      </View>

      {/* KPI 2: Hora del registro */}
      <View style={[styles.kpiCard, isSelected && styles.kpiCardInspecting]}>
        <Text style={styles.kpiTitle}>
          {isSelected ? 'Hora de este día' : 'Hora del registro'}
        </Text>
        <View style={styles.kpiContentCenter}>
          <Text style={[styles.kpiBigNumber, { color: isSelected ? '#1A7A54' : '#0284C7' }]}>
            {timeText}
          </Text>
          <Text style={styles.kpiSublabel}>{timeSublabel}</Text>
        </View>
        <View style={isSelected ? styles.kpiBadgeGreen : styles.kpiBadgeBlue}>
          <Ionicons
            name={isSelected ? 'radio-button-on' : 'time-outline'}
            size={11}
            color={isSelected ? '#1A7A54' : '#0284C7'}
          />
          <Text style={isSelected ? styles.kpiBadgeGreenText : styles.kpiBadgeBlueText}>
            {badgeText}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Subcomponente: Detalle clínico de jornada única
const DayDetailCard: React.FC<{ record: MySqlDailyHabitRecord }> = ({ record }) => {
  const confirmedHour = record.confirmed_at?.split(' ')[1] || 'hora confirmada';
  return (
    <View style={styles.dayDetailCard}>
      <View style={styles.dayDetailHeader}>
        <View style={styles.dayDetailIconWrap}>
          <Ionicons name="checkmark-done-circle" size={28} color="#1A7A54" />
        </View>
        <View>
          <Text style={styles.dayDetailTitle}>
            {formatToChileanDate(record.evaluation_date)}
          </Text>
          <Text style={styles.dayDetailSubtitle}>
            Registrado a las {confirmedHour}
          </Text>
        </View>
      </View>
      <View style={styles.dayDetailDivider} />
      <Text style={styles.dayDetailDesc}>
        Evaluación completa registrada por el paciente. Puedes revisar los promedios y desglose de cada hábito abajo.
      </Text>
    </View>
  );
};

// Subcomponente: Banner de inspección de día seleccionado
const InspectingBanner: React.FC<{
  record: MySqlDailyHabitRecord;
  onDeselect: () => void;
}> = ({ record, onDeselect }) => (
  <View style={styles.inspectingBannerTop}>
    <View style={styles.inspectingBannerTopHeader}>
      <View style={styles.inspectingPillRow}>
        <View style={styles.inspectingLiveDot} />
        <Text style={styles.inspectingPillText}>DÍA EN INSPECCIÓN</Text>
      </View>

      <TouchableOpacity
        style={styles.deselectBtn}
        onPress={onDeselect}
        activeOpacity={0.7}
      >
        <Ionicons name="close-circle" size={17} color="#475569" />
        <Text style={styles.deselectBtnText}>Deseleccionar</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.inspectingMainInfo}>
      <View style={styles.inspectingCalendarIconWrap}>
        <Ionicons name="calendar" size={22} color="#1A7A54" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.inspectingDateText}>
          {formatToChileanDate(record.evaluation_date)}
        </Text>
        <View style={styles.inspectingTimeMetaRow}>
          <Ionicons name="time" size={13} color="#0284C7" />
          <Text style={styles.inspectingTimeMetaText}>
            Check-in confirmado a las {formatTimeOnly(record.confirmed_at)} hrs
          </Text>
        </View>
      </View>
    </View>

    <View style={styles.inspectingFooterHint}>
      <Ionicons name="sparkles" size={13} color="#166534" />
      <Text style={styles.inspectingFooterHintText}>
        Métricas y desglose inferior enfocados en esta fecha. Pulsa Deseleccionar para volver al promedio.
      </Text>
    </View>
  </View>
);

// Subcomponente: Selector horizontal de días en el timeline
const DaySelectorTimeline: React.FC<{
  records: MySqlDailyHabitRecord[];
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
}> = ({ records, selectedDate, onSelectDay }) => (
  <View style={styles.daySelectorContainer}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.daySelectorScroll}
    >
      {records.map((r) => {
        const recDate = getDatePrefix(r.evaluation_date);
        const isSelected = selectedDate === recDate;
        const dateParts = recDate.split('-');
        const dayMonth = `${dateParts[2]}/${dateParts[1]}`;

        const [y, m, d] = dateParts.map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayName = DAY_NAMES[dateObj.getDay()];

        return (
          <TouchableOpacity
            key={recDate}
            style={[styles.dayChip, isSelected && styles.dayChipSelected]}
            onPress={() => onSelectDay(recDate)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayChipDayName, isSelected && styles.dayChipDayNameSelected]}>
              {dayName}
            </Text>
            <Text style={[styles.dayChipDate, isSelected && styles.dayChipDateSelected]}>
              {dayMonth}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

// Subcomponente: Tarjeta individual de desglose por hábito
const HabitBreakdownCard: React.FC<{
  habitKey: HabitKey;
  selectedRecord: MySqlDailyHabitRecord | null;
  averages: Record<HabitKey, number> & { sueno_horas: number };
}> = ({ habitKey, selectedRecord, averages }) => {
  const cfg = HABIT_CONFIG[habitKey];
  const { displayScore, percentage, qualitative, subDetail } = selectedRecord
    ? getSingleDayHabitMetrics(habitKey, selectedRecord)
    : getAverageHabitMetrics(habitKey, averages);

  return (
    <View style={[styles.habitCard, selectedRecord && styles.habitCardSelectedMode]}>
      <View style={styles.habitCardTop}>
        <View style={[styles.habitIconWrap, { backgroundColor: cfg.areaColor }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.habitCardName}>{cfg.label}</Text>
          {subDetail ? <Text style={styles.habitCardSub}>{subDetail}</Text> : null}
        </View>
        <View style={styles.habitScoreGroup}>
          <Text style={[styles.habitCardScore, { color: cfg.color }]}>{displayScore}</Text>
          {qualitative ? (
            <View style={[styles.qualitativePill, { backgroundColor: cfg.areaColor }]}>
              <Text style={[styles.qualitativePillText, { color: cfg.color }]}>{qualitative}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${percentage}%`,
              backgroundColor: cfg.color,
            },
          ]}
        />
      </View>
    </View>
  );
};

export const PatientHabitReportScreen: React.FC<Props> = ({ navigation, route }) => {
  const { patient, filters: initialFilters } = route.params;

  const [filters, setFilters] = useState<HabitReportFilters>(initialFilters);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rawRecords, setRawRecords] = useState<MySqlDailyHabitRecord[]>([]);
  const [firstSessionDate, setFirstSessionDate] = useState<string | null>(null);
  const [activeChartHabit, setActiveChartHabit] = useState<HabitKey>(
    initialFilters.habits[0] || 'sueno'
  );
  const [selectedRecordDate, setSelectedRecordDate] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRecordDate(null);
  }, [filters]);

  useEffect(() => {
    if (filters.habits.length > 0 && !filters.habits.includes(activeChartHabit)) {
      setActiveChartHabit(filters.habits[0]);
    }
  }, [filters.habits, activeChartHabit]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const identifier = getPatientIdentifier(patient);
      const [habitsData, appointmentsData] = await Promise.all([
        habitService.getHabitsHistory(identifier),
        fetchPatientAppointments(patient.id),
      ]);
      setRawRecords(habitsData || []);
      setFirstSessionDate(calculateFirstSessionDate(appointmentsData, patient, getLocalDateString()));
    } catch (error) {
      console.error('Error al cargar hábitos en el informe:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patient]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const effectiveTherapyStartDate = useMemo(
    () => getEffectiveTherapyStartDate(firstSessionDate, patient, rawRecords),
    [firstSessionDate, patient, rawRecords]
  );

  const filteredRecords = useMemo(
    () => filterRecordsByPeriod(rawRecords, filters, effectiveTherapyStartDate),
    [rawRecords, filters, effectiveTherapyStartDate]
  );

  const chronologicalRecords = useMemo(
    () => sortRecordsChronologically(filteredRecords),
    [filteredRecords]
  );

  const selectedRecord = useMemo(
    () => findSelectedRecord(filteredRecords, selectedRecordDate),
    [selectedRecordDate, filteredRecords]
  );

  const handleSelectDay = (dateStr: string) => {
    setSelectedRecordDate((prev) => (prev === dateStr ? null : dateStr));
  };

  const stats = useMemo(
    () => calculateReportStats(filteredRecords, filters, effectiveTherapyStartDate),
    [filteredRecords, filters, effectiveTherapyStartDate]
  );

  const currentYAxisLabelTexts = useMemo(
    () => getYAxisLabels(activeChartHabit),
    [activeChartHabit]
  );

  const currentYAxisLabelWidth = getYAxisLabelWidth(activeChartHabit);

  const dynamicSpacing = useMemo(
    () => calculateDynamicSpacing(chronologicalRecords.length, currentYAxisLabelWidth),
    [chronologicalRecords.length, currentYAxisLabelWidth]
  );

  const chartData = useMemo(
    () => generateChartData(chronologicalRecords, activeChartHabit, selectedRecordDate, handleSelectDay),
    [chronologicalRecords, activeChartHabit, selectedRecordDate]
  );

  const formatYLabel = useCallback(
    (label: string) => formatYAxisLabel(label, activeChartHabit),
    [activeChartHabit]
  );

  const periodPillText = useMemo(
    () => getPeriodFilterText(filters, effectiveTherapyStartDate),
    [filters, effectiveTherapyStartDate]
  );

  const emptyPeriodText = useMemo(
    () => getEmptyPeriodDescription(filters, effectiveTherapyStartDate),
    [filters, effectiveTherapyStartDate]
  );

  const headingText = selectedRecord
    ? `Desglose del día (${formatToChileanDate(selectedRecord.evaluation_date)})`
    : 'Desglose Clínico por Hábito';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Superior */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Informe de Hábitos</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {patient.nombre} {patient.apellido_paterno}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="filter" size={17} color="#1A7A54" />
          <Text style={styles.filterBtnText}>Filtros</Text>
        </TouchableOpacity>
      </View>

      {/* Pill de Rango Activo */}
      <View style={styles.activeFilterBar}>
        <View style={styles.activeFilterPill}>
          <Ionicons name="calendar-outline" size={14} color="#1A7A54" />
          <Text style={styles.activeFilterPillText}>{periodPillText}</Text>
        </View>
        <Text style={styles.recordsCountText}>
          {filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1A7A54" />
          <Text style={styles.loadingText}>Procesando métricas clínicas...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A7A54']} />
          }
        >
          {filteredRecords.length === 0 ? (
            <EmptyReportCard
              periodText={emptyPeriodText}
              onOpenFilters={() => setShowFilterModal(true)}
            />
          ) : (
            <>
              {/* Tarjetas de Resumen Ejecutivo (KPIs) */}
              <ReportKpis stats={stats} selectedRecord={selectedRecord} />

              {/* Si es un día específico, mostrar detalle clínico de esa jornada */}
              {filters.period === 'day' ? (
                <DayDetailCard record={filteredRecords[0]} />
              ) : (
                <>
                  {selectedRecord && (
                    <InspectingBanner
                      record={selectedRecord}
                      onDeselect={() => setSelectedRecordDate(null)}
                    />
                  )}

                  {/* Gráfico Único: Tendencia en el Tiempo */}
                  <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                      <View>
                        <Text style={styles.chartTitle}>Tendencia en el Tiempo</Text>
                        <Text style={styles.chartSubtitle}>
                          Evolución clínica diaria ({HABIT_CONFIG[activeChartHabit]?.label})
                        </Text>
                      </View>
                    </View>

                    {/* Selector de hábito individual */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chartPillsScroll}
                    >
                      {filters.habits.map((hKey) => {
                        const isCurSelected = activeChartHabit === hKey;
                        const cfg = HABIT_CONFIG[hKey];
                        return (
                          <TouchableOpacity
                            key={hKey}
                            style={[
                              styles.chartPill,
                              isCurSelected && { backgroundColor: cfg.color, borderColor: cfg.color },
                            ]}
                            onPress={() => setActiveChartHabit(hKey)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.chartPillText,
                                isCurSelected && { color: '#FFFFFF', fontWeight: '700' },
                              ]}
                            >
                              {cfg.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Render del Gráfico GiftedCharts de hábito único */}
                    <View style={styles.chartWrapper}>
                      <LineChart
                        data={chartData}
                        height={220}
                        spacing={dynamicSpacing}
                        initialSpacing={22}
                        endSpacing={30}
                        curved
                        areaChart
                        startFillColor={HABIT_CONFIG[activeChartHabit]?.areaColor || '#E8F5EE'}
                        endFillColor="#FFFFFF"
                        startOpacity={0.65}
                        endOpacity={0.05}
                        color={HABIT_CONFIG[activeChartHabit]?.color || '#1A7A54'}
                        thickness={3}
                        maxValue={5}
                        noOfSections={5}
                        stepValue={1}
                        noOfSectionsBelowXAxis={0}
                        overflowTop={36}
                        yAxisExtraHeight={22}
                        yAxisLabelTexts={currentYAxisLabelTexts}
                        yAxisLabelPrefix=""
                        yAxisLabelSuffix=""
                        formatYLabel={formatYLabel}
                        yAxisLabelWidth={currentYAxisLabelWidth}
                        yAxisTextStyle={CHART_Y_AXIS_TEXT_STYLE}
                        xAxisLabelTextStyle={{ fontSize: 9, color: '#64748B' }}
                        showValuesAsDataPointsText={false}
                        textColor="transparent"
                        textFontSize={0}
                        dataPointsColor={HABIT_CONFIG[activeChartHabit]?.color || '#1A7A54'}
                        dataPointsRadius={8}
                        zIndex1={1}
                        yAxisColor="#E2E8F0"
                        xAxisColor="#E2E8F0"
                        rulesColor="#F1F5F9"
                        isAnimated={false}
                        animateOnDataChange={false}
                      />
                    </View>

                    {/* Selector interactivo de días (Timeline horizontal) */}
                    <DaySelectorTimeline
                      records={chronologicalRecords}
                      selectedDate={selectedRecordDate}
                      onSelectDay={handleSelectDay}
                    />
                  </View>
                </>
              )}

              {/* Desglose Individual por Hábito */}
              <View style={styles.sectionHeadingRow}>
                <Ionicons name="list-circle" size={20} color="#1A7A54" />
                <Text style={styles.sectionHeading}>{headingText}</Text>
                {selectedRecord && (
                  <TouchableOpacity
                    style={styles.headingResetPill}
                    onPress={() => setSelectedRecordDate(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={12} color="#1A7A54" />
                    <Text style={styles.headingResetPillText}>Ver promedios</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.habitsCardsList}>
                {filters.habits.map((habitKey) => (
                  <HabitBreakdownCard
                    key={habitKey}
                    habitKey={habitKey}
                    selectedRecord={selectedRecord}
                    averages={stats.averages}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Modal para reconfigurar filtros desde esta misma pantalla */}
      <HabitFilterModal
        visible={showFilterModal}
        initialFilters={filters}
        onClose={() => setShowFilterModal(false)}
        onConfirm={(newFilters) => {
          setFilters(newFilters);
          setShowFilterModal(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A7A54',
  },
  activeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3FAF6',
    borderWidth: 1,
    borderColor: '#C6E7D6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  activeFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A7A54',
  },
  recordsCountText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A7A54',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiContentCenter: {
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercentageText: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  kpiBigNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiSublabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  kpiBadgeGreen: {
    marginTop: 6,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  kpiBadgeGreenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A7A54',
  },
  kpiBadgeBlue: {
    marginTop: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiBadgeBlueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  dayDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayDetailIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDetailTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  dayDetailSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  dayDetailDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  dayDetailDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chartPillsScroll: {
    paddingVertical: 6,
    gap: 6,
  },
  chartPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartPillActive: {
    backgroundColor: '#1A7A54',
    borderColor: '#1A7A54',
  },
  chartPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chartPillTextActive: {
    color: '#FFFFFF',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  chartWrapper: {
    marginTop: 8,
    paddingTop: 16,
    width: '100%',
  },
  daySelectorContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  daySelectorScroll: {
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    minWidth: 54,
  },
  dayChipSelected: {
    backgroundColor: '#1A7A54',
    borderColor: '#1A7A54',
    shadowColor: '#1A7A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  dayChipDayName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  dayChipDayNameSelected: {
    color: '#D1FAE5',
    fontWeight: '700',
  },
  dayChipDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  dayChipDateSelected: {
    color: '#FFFFFF',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  habitsCardsList: {
    gap: 10,
    marginBottom: 20,
  },
  habitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  habitCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  habitIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  habitCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  habitScoreGroup: {
    alignItems: 'flex-end',
  },
  habitCardScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  qualitativePill: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualitativePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  kpiCardInspecting: {
    borderColor: '#1A7A54',
    borderWidth: 1.5,
  },
  inspectingBannerTop: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#1A7A54',
    shadowColor: '#1A7A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inspectingBannerTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inspectingPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inspectingLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  inspectingPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  deselectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deselectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  inspectingMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inspectingCalendarIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inspectingDateText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inspectingTimeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  inspectingTimeMetaText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
  },
  inspectingFooterHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inspectingFooterHintText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
  },
  headingResetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  headingResetPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A7A54',
  },
  habitCardSelectedMode: {
    borderColor: '#CBD5E1',
    backgroundColor: '#FCFDFD',
  },
});
