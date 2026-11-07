import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { PatientBottomNav, PatientTab } from '../../components/Iconosbarrapaciente';
import { hopeService, HopeMessage } from '../../services/hopeService';
import { ExerciseHabitKey } from './Ejercicios.paciente';

const COLORS = {
  screenBackground: '#EAF5EE',
  cardBackground: '#FFFFFF',
  greenPrimary: '#0F613B',
  greenSoft: '#E4EDE7',
  greenSurface: '#E8F5E9',
  greenBorder: '#C8E6C9',
  patientBubble: '#0F613B',
  patientText: '#FFFFFF',
  botBubble: '#FFFFFF',
  botText: '#1F2937',
  textSecondary: '#6B7280',
  dangerBg: '#FEE2E2',
  dangerText: '#991B1B',
  dangerBorder: '#F87171',
  shadow: '#000000',
};

export interface ExerciseCardData {
  id: string;
  title: string;
  technique: string;
  section: ExerciseHabitKey;
  sectionTitle: string;
  videoId: string;
  duration: string;
}

export const EXERCISE_CATALOG: Record<string, ExerciseCardData> = {
  '478': {
    id: '478',
    title: 'Técnica 4-7-8',
    technique: 'Respiración Diafragmática',
    section: 'ansiedad',
    sectionTitle: 'Ansiedad',
    videoId: 'EGO5m_DBzF8',
    duration: '4 min (Guiado)',
  },
  'grounding': {
    id: 'grounding',
    title: 'Grounding 5-4-3-2-1',
    technique: 'Anclaje Sensorial al Presente',
    section: 'ansiedad',
    sectionTitle: 'Ansiedad',
    videoId: '37FzHqlcxUI',
    duration: '3 min (Guiado)',
  },
  '444': {
    id: '444',
    title: 'Respiración 4-4-4',
    technique: 'Respiración en Caja',
    section: 'ansiedad',
    sectionTitle: 'Ansiedad',
    videoId: 'Nvtr6Ms4bmo',
    duration: '3 min (Guiado)',
  },
  'jacobson': {
    id: 'jacobson',
    title: 'Técnica Jacobson',
    technique: 'Relajación Muscular Progresiva',
    section: 'estres',
    sectionTitle: 'Estrés',
    videoId: 'A-FKeahD_lQ',
    duration: '10 min (Guiado)',
  },
  'stop': {
    id: 'stop',
    title: 'Técnica STOP',
    technique: 'Pausa Consciente y Regulación',
    section: 'estres',
    sectionTitle: 'Estrés',
    videoId: 'D2fQFnW3Rqk',
    duration: '2 min (Guiado)',
  },
  'sueno': {
    id: 'sueno',
    title: 'Control de Estímulos',
    technique: 'Higiene del Sueño',
    section: 'sueno',
    sectionTitle: 'Sueño',
    videoId: '68MVZuHHpLA',
    duration: 'Rutina de descanso',
  },
};

const DISCARD_PHRASES = [
  'no es para todos', 'no es lo tuyo', 'no tiene que ser', 'no tienes que',
  'en lugar de la técnica', 'en vez de la técnica', 'disculpa el error',
  'disculpa la confusión', 'disculpa si no', 'disculpa', 'perdón', 'perdon',
  'tienes toda la razón', 'tienes toda la razon', 'como te mencioné', 'como te mencione',
  'como mencioné', 'como mencione', 'que mencioné', 'que mencione',
  'categoría "ansiedad"', 'categoria "ansiedad"', 'categoría "estrés"',
  'categoria "estres"', 'categoría "sueño"', 'categoria "sueno"',
] as const;

const RECOMMENDATION_INTENT_PHRASES = [
  'recomiend', 'sugier', 'intentar', 'probar', 'te dejo', 'te comparto',
  'puedes hacer', 'acceso a una herramienta', 'acceso a un ejercicio',
  'herramienta llamada', 'video', 'ejercicio', 'ejercicios', 'quieres hacer',
  'te gustaría', 'te gustaria', 'hacer una pausa', 'pausa con', 'técnica de',
  'tecnica de', 'ayudarte a encontrar', 'encontrar',
] as const;

interface ExerciseMatcher {
  id: string;
  keywords: readonly string[];
}

const EXERCISE_MATCHERS: readonly ExerciseMatcher[] = [
  {
    id: '444',
    keywords: ['4-4-4', '444', 'respiración en caja', 'respiracion en caja'],
  },
  {
    id: '478',
    keywords: [
      '4-7-8', '478', 'respiración diafragmática', 'respiracion diafragmatica',
      'respiración guiada', 'respiracion guiada', 'técnica de respiración',
      'tecnica de respiracion', 'ejercicio de respiración', 'ejercicio de respiracion',
      'respiración profunda', 'respiracion profunda', 'calmarte',
      'pausa con la técnica de respiración', 'respiración', 'respiracion',
    ],
  },
  {
    id: 'grounding',
    keywords: ['grounding', '5-4-3-2-1', '54321', 'anclaje sensorial', 'anclaje al presente'],
  },
  {
    id: 'jacobson',
    keywords: ['jacobson', 'relajación muscular', 'relajacion muscular', 'tensión muscular', 'tension muscular'],
  },
  {
    id: 'stop',
    keywords: ['técnica stop', 'tecnica stop', 'herramienta stop', 'pausa consciente'],
  },
  {
    id: 'sueno',
    keywords: [
      'control de estímulos', 'control de estimulos', 'higiene del sueño',
      'higiene del sueno', 'rutina de descanso', 'rutina de sueño', 'rutina de sueno',
    ],
  },
];

function isDiscardedMessage(text: string): boolean {
  return DISCARD_PHRASES.some((phrase) => text.includes(phrase));
}

function hasRecommendationIntent(text: string): boolean {
  return RECOMMENDATION_INTENT_PHRASES.some((phrase) => text.includes(phrase));
}

function matchesExerciseKeywords(text: string, matcher: ExerciseMatcher, has444: boolean): boolean {
  if (matcher.id === '478' && has444 && !text.includes('4-7-8') && !text.includes('478')) {
    return false;
  }
  return matcher.keywords.some((kw) => text.includes(kw));
}

function collectMatchedExercises(normalized: string): ExerciseCardData[] {
  const matched: ExerciseCardData[] = [];
  const matchedIds = new Set<string>();

  for (const matcher of EXERCISE_MATCHERS) {
    if (matchesExerciseKeywords(normalized, matcher, matchedIds.has('444'))) {
      const exercise = EXERCISE_CATALOG[matcher.id];
      if (exercise && !matchedIds.has(exercise.id)) {
        matched.push(exercise);
        matchedIds.add(exercise.id);
      }
    }
  }

  return matched;
}

export function detectRecommendedExercises(text: string): ExerciseCardData[] {
  const normalized = text.toLowerCase();

  if (isDiscardedMessage(normalized) || !hasRecommendationIntent(normalized)) {
    return [];
  }

  return collectMatchedExercises(normalized).slice(0, 2);
}

interface PatientChatbotScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
  onOpenExerciseDetail?: (habitKey: ExerciseHabitKey, habitTitle: string) => void;
}

interface DisplayMessage {
  id: string;
  sender: 'paciente' | 'hope';
  text: string;
  timestamp: string;
}

/**
 * Obtiene los identificadores de ejercicios ya sugeridos en mensajes anteriores del bot.
 */
function getPreviouslyShownExerciseIds(
  currentIndex: number,
  allMessages: readonly DisplayMessage[]
): Set<string> {
  const shown = new Set<string>();
  for (let i = 0; i < currentIndex; i++) {
    const msg = allMessages[i];
    if (msg?.sender === 'hope') {
      const exercises = detectRecommendedExercises(msg.text);
      for (const ex of exercises) {
        shown.add(ex.id);
      }
    }
  }
  return shown;
}

/**
 * Detecta si el mensaje de Hope es una propuesta o pregunta preliminar (Paso 1).
 * Si es solo una propuesta preliminar, NO se debe mostrar la tarjeta de video todavía.
 */
function isProposalQuestion(text: string): boolean {
  const norm = text.toLowerCase();
  const hasQuestion = norm.includes('?');
  const hasProposalWord =
    norm.includes('te gustaria') ||
    norm.includes('te gustaría') ||
    norm.includes('quieres') ||
    norm.includes('probamos') ||
    norm.includes('hacemos una pausa') ||
    norm.includes('te parece si') ||
    norm.includes('si dijeras');
  return hasQuestion && hasProposalWord;
}

/**
 * Detecta si el mensaje del paciente fue afirmativo o solicitó video explícitamente.
 */
function isAffirmativeOrVideoRequest(text: string): boolean {
  const norm = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Si contiene quejas, desahogo emocional o frustración, NO es una confirmación de video
  if (/(vacio|vacío|triste|mal\b|reconfort|nada\b|pena|dolor|angustia|desahog|horrible|feo|cansad|desmotivad|no me sirve|no me ayuda|no aportas|varado|inutil|llorar)/i.test(norm)) {
    return false;
  }

  const explicit = [
    'reproducir', 'ver video', 'ver el video', 'abrir video',
    'pon el video', 'ponlo', 'youtube', 'quiero ver el video', 'muestramelo', 'muestrame el video'
  ];
  if (explicit.some((kw) => norm.includes(kw))) {
    return true;
  }

  const aff = [
    'si', 'si por favor', 'dale', 'bueno', 'ok', 'okay', 'claro', 'vamos', 'por favor', 'porfa',
    'quiero', 'me gustaria', 'hagamoslo', 'de acuerdo', 'seguro', 'perfecto', 'listo'
  ];
  return aff.some((w) => norm === w || norm === `${w} por favor` || norm === `${w} gracias`);
}

/**
 * Filtra los ejercicios que deben mostrarse en un mensaje particular.
 * REGLA GENERAL: Solo se muestra la tarjeta cuando el paciente confirmó o pidió el video (Paso 2),
 * NO cuando Hope apenas está proponiendo el ejercicio en una pregunta (Paso 1).
 */
function getExercisesForMessage(
  item: DisplayMessage,
  index: number,
  allMessages: readonly DisplayMessage[]
): ExerciseCardData[] {
  if (item.sender !== 'hope') {
    return [];
  }

  // Si Hope está apenas haciendo la pregunta o propuesta preliminar (Paso 1), NO mostrar tarjeta
  if (isProposalQuestion(item.text)) {
    return [];
  }

  // Verificar si el paciente aceptó o pidió video previamente
  const prevMsg = index > 0 ? allMessages[index - 1] : null;
  const patientAccepted = prevMsg?.sender === 'paciente' && isAffirmativeOrVideoRequest(prevMsg.text);

  const norm = item.text.toLowerCase();
  const botDelivered =
    norm.includes('excelente decision') ||
    norm.includes('excelente decisión') ||
    norm.includes('ya te abri') ||
    norm.includes('ya te abrí') ||
    norm.includes('tienes listo el video') ||
    norm.includes('aqui tienes el video') ||
    norm.includes('aquí tienes el video') ||
    norm.includes('video guiado');

  if (!patientAccepted && !botDelivered) {
    return [];
  }

  // Resolver qué ejercicio corresponde (del texto actual o de la propuesta anterior de Hope)
  let detected = detectRecommendedExercises(item.text);
  if (detected.length === 0) {
    const earlierBotMsg = allMessages.slice(0, index).findLast((m) => m.sender === 'hope');
    if (earlierBotMsg) {
      detected = detectRecommendedExercises(earlierBotMsg.text);
    }
  }

  if (detected.length === 0) {
    detected = [EXERCISE_CATALOG['478']];
  }

  const previouslyShown = getPreviouslyShownExerciseIds(index, allMessages);
  return detected.filter((ex) => !previouslyShown.has(ex.id));
}

interface ExerciseSuggestionCardProps {
  exercise: ExerciseCardData;
  onPlay: (ex: ExerciseCardData) => void;
  onOpenDetail?: (habitKey: ExerciseHabitKey, habitTitle: string) => void;
  onNavigateTab: (tab: PatientTab) => void;
}

const ExerciseSuggestionCard: React.FC<ExerciseSuggestionCardProps> = ({
  exercise,
  onPlay,
  onOpenDetail,
  onNavigateTab,
}) => {
  const handleOpenDetail = () => {
    if (onOpenDetail) {
      onOpenDetail(exercise.section, exercise.sectionTitle);
    } else {
      onNavigateTab('exercises');
    }
  };

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseCardHeader}>
        <Ionicons name="sparkles" size={13} color={COLORS.greenPrimary} />
        <Text style={styles.exerciseCardTag}>RECURSO SUGERIDO POR H.O.P.E</Text>
      </View>

      <View style={styles.exerciseCardBody}>
        <Image
          source={{ uri: `https://img.youtube.com/vi/${exercise.videoId}/hqdefault.jpg` }}
          style={styles.exerciseThumbnail}
          resizeMode="cover"
        />
        <View style={styles.exerciseTextGroup}>
          <Text style={styles.exerciseTitle} numberOfLines={1}>
            {exercise.title}
          </Text>
          <Text style={styles.exerciseTechnique}>{exercise.technique}</Text>
          <Text style={styles.exerciseDuration}>{exercise.duration}</Text>
        </View>
      </View>

      <View style={styles.exerciseActionsRow}>
        <TouchableOpacity
          style={styles.playInlineButton}
          onPress={() => onPlay(exercise)}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={13} color="#FFFFFF" />
          <Text style={styles.playInlineText}>Reproducir video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.redirectSectionButton}
          onPress={handleOpenDetail}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward-circle-outline" size={15} color={COLORS.greenPrimary} />
          <Text style={styles.redirectSectionText}>Ir al ejercicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface EmergencyActionCardProps {
  onCall: (phoneNumber: string) => void;
}

const EmergencyActionCard: React.FC<EmergencyActionCardProps> = ({ onCall }) => {
  return (
    <View style={styles.emergencyCardContainer}>
      <View style={styles.emergencyCardHeader}>
        <Ionicons name="shield-checkmark" size={16} color="#DC2626" />
        <Text style={styles.emergencyCardTag}>CANALES DE APOYO EN CHILE (24/7)</Text>
      </View>
      <Text style={styles.emergencyCardDesc}>
        Líneas oficiales, gratuitas y confidenciales con atención humana inmediata:
      </Text>

      <TouchableOpacity
        style={styles.emergencyActionButton}
        onPress={() => onCall('*4141')}
        activeOpacity={0.85}
      >
        <View style={styles.emergencyIconCircle}>
          <Ionicons name="call" size={15} color="#FFFFFF" />
        </View>
        <View style={styles.emergencyActionTextGroup}>
          <Text style={styles.emergencyActionTitle}>Llamar al *4141 (Gratis 24/7)</Text>
          <Text style={styles.emergencyActionSubtitle}>Fono Prevención del Suicidio - MinSal</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.emergencyActionButtonSecondary}
        onPress={() => onCall('6003607777')}
        activeOpacity={0.85}
      >
        <View style={[styles.emergencyIconCircle, { backgroundColor: '#2563EB' }]}>
          <Ionicons name="call" size={15} color="#FFFFFF" />
        </View>
        <View style={styles.emergencyActionTextGroup}>
          <Text style={[styles.emergencyActionTitle, { color: '#1E3A8A' }]}>Salud Responde (600 360 7777)</Text>
          <Text style={styles.emergencyActionSubtitleSecondary}>Orientación y contención profesional</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#2563EB" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.emergencyActionButtonSecondary}
        onPress={() => onCall('131')}
        activeOpacity={0.85}
      >
        <View style={[styles.emergencyIconCircle, { backgroundColor: '#DC2626' }]}>
          <Ionicons name="medkit" size={15} color="#FFFFFF" />
        </View>
        <View style={styles.emergencyActionTextGroup}>
          <Text style={[styles.emergencyActionTitle, { color: '#991B1B' }]}>SAMU Urgencias (131)</Text>
          <Text style={styles.emergencyActionSubtitleSecondary}>Ambulancia ante riesgo físico vital</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );
};

export const PatientChatbotScreen: React.FC<PatientChatbotScreenProps> = ({
  onNavigateTab,
  userName = 'Paciente',
  onOpenExerciseDetail,
}) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [engineStatus, setEngineStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      sender: 'hope',
      text: `¡Hola, ${userName}! Soy H.o.p.e, tu asistente de apoyo emocional y seguimiento de hábitos entre tus sesiones.\n\nEstoy aquí para escucharte y acompañarte en lo que necesites reflexionar hoy sobre tu día, tu descanso o cómo te has sentido. ¿De qué te gustaría hablar?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [hasCrisisAlert, setHasCrisisAlert] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeVideoModal, setActiveVideoModal] = useState<ExerciseCardData | null>(null);

  // Altura exacta calculada de la barra inferior de iconos (52px botones + padding seguro)
  const hotbarHeight = 52 + Math.max(insets.bottom, 14);

  // Separación en reposo: elevado holgadamente sobre la barra de iconos (solicitado en Imagen 2)
  const restingMargin = hotbarHeight + 20;

  // Separación cuando el teclado está abierto:
  // En iOS, KeyboardAvoidingView (padding) ya suma la altura del teclado, por lo que solo requiere margen interno (12px).
  // En Android, la barra de navegación del sistema (insets.bottom) y el teclado Samsung ocupan:
  // keyboardHeight + insets.bottom. Añadimos un margen (+12px) para que el recuadro quede 100% visible y cómodo sobre el teclado.
  const calculateInputBottomMargin = (): number => {
    if (Platform.OS === 'ios') {
      return isKeyboardVisible ? 12 : restingMargin;
    }
    if (isKeyboardVisible || keyboardHeight > 0) {
      const effectiveKeyboardHeight = keyboardHeight > 0 ? keyboardHeight : 290;
      const navBarOffset = Math.max(insets.bottom, 24);
      return effectiveKeyboardHeight + navBarOffset + 12;
    }
    return restingMargin;
  };

  const inputBottomMargin = calculateInputBottomMargin();

  const getEngineStatusColor = (): string => {
    if (engineStatus === 'online') return '#10B981';
    if (engineStatus === 'checking') return '#F59E0B';
    return '#EF4444';
  };

  const getEngineStatusLabel = (): string => {
    if (engineStatus === 'online') return 'En línea';
    if (engineStatus === 'checking') return 'Conectando...';
    return 'Desconectado';
  };

  useEffect(() => {
    void loadSessionHistory();
    void verifyEngineHealth();

    const onKeyboardShow = (e: any) => {
      const h = e?.endCoordinates?.height || 290;
      setKeyboardHeight(h);
      setIsKeyboardVisible(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    const onKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onKeyboardShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onKeyboardHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const verifyEngineHealth = async () => {
    try {
      const res = await hopeService.getStatus();
      setEngineStatus(res.online ? 'online' : 'offline');
    } catch (error) {
      console.warn('⚠️ [Hope Health Check Error]:', error);
      setEngineStatus('offline');
    }
  };

  const loadSessionHistory = async () => {
    try {
      const res = await hopeService.getHistory();
      if (res.success && res.history && res.history.length > 0) {
        // Solo restauramos mensajes si existe una sesión actualmente activa (sin finalizar)
        const activeSession = res.history.find((s: any) => !s.finalizada_en);
        if (activeSession?.mensajes && activeSession.mensajes.length > 0) {
          const hasEmergency =
            activeSession.mensajes.some((m: HopeMessage) =>
              m.mensaje.includes('*4141') || m.mensaje.includes('Salud Responde')
            ) || activeSession.animo_predominante === 'Crisis / Riesgo Severo';
          if (hasEmergency) {
            setHasCrisisAlert(true);
          }

          const loaded: DisplayMessage[] = activeSession.mensajes.map((m: HopeMessage, idx: number) => ({
            id: `hist-${idx}`,
            sender: m.remitente,
            text: m.mensaje,
            timestamp: m.enviado_en
              ? new Date(m.enviado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
          }));
          setMessages(loaded);
        }
      }
    } catch (error) {
      console.warn('⚠️ [Hope History]: No se pudo precargar historial previo:', error);
    }
  };

  /**
   * Resuelve el ejercicio propuesto en el chat o devuelve la técnica 4-7-8 por defecto.
   */
  const resolveExerciseFromHistory = (lastBotText: string): ExerciseCardData => {
    const norm = lastBotText.toLowerCase();
    if (norm.includes('4-4-4') || norm.includes('444') || norm.includes('caja')) {
      return EXERCISE_CATALOG['444'];
    }
    if (norm.includes('grounding') || norm.includes('5-4-3-2-1') || norm.includes('54321') || norm.includes('anclaje')) {
      return EXERCISE_CATALOG['grounding'];
    }
    if (norm.includes('jacobson') || norm.includes('muscular') || norm.includes('tension') || norm.includes('tensión')) {
      return EXERCISE_CATALOG['jacobson'];
    }
    if (norm.includes('stop')) {
      return EXERCISE_CATALOG['stop'];
    }
    if (norm.includes('sueño') || norm.includes('sueno') || norm.includes('dormir') || norm.includes('descanso')) {
      return EXERCISE_CATALOG['sueno'];
    }
    return EXERCISE_CATALOG['478'];
  };

  /**
   * Detecta si el paciente pidió reproducir el video por texto o confirmó con un "Si" ante una sugerencia.
   * Abre automáticamente el modal para reproducir o abrir en YouTube.
   */
  const tryOpenVideoByIntent = (text: string, currentMessages: DisplayMessage[]): void => {
    const normUser = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // No abrir modal si el mensaje es de desahogo emocional, queja o tristeza
    if (/(vacio|vacío|triste|mal\b|reconfort|nada\b|pena|dolor|angustia|desahog|horrible|feo|cansad|desmotivad|no me sirve|no me ayuda|no aportas|varado|inutil|llorar)/i.test(normUser)) {
      return;
    }

    const isExplicitVideo =
      normUser.includes('reproducir') ||
      normUser.includes('ver video') ||
      normUser.includes('ver el video') ||
      normUser.includes('abrir video') ||
      normUser.includes('pon el video') ||
      normUser.includes('ponlo') ||
      normUser.includes('youtube') ||
      normUser.includes('muestramelo') ||
      normUser.includes('muestrame el video') ||
      normUser.includes('quiero ver el video');

    const affirmativeExact = [
      'si', 'si por favor', 'dale', 'bueno', 'ok', 'okay', 'claro', 'vamos', 'por favor', 'porfa',
      'de acuerdo', 'quiero', 'me gustaria', 'hagamoslo', 'seguro', 'perfecto', 'listo',
    ];
    const isAffirmative = affirmativeExact.some(
      (aff) => normUser === aff || normUser === `${aff} por favor` || normUser === `${aff} gracias`
    );

    if (!isExplicitVideo && !isAffirmative) return;

    const lastBotMsg = currentMessages.findLast((m) => m.sender === 'hope');
    if (!lastBotMsg) return;

    const normBot = lastBotMsg.text.toLowerCase();
    const botProposedTechniqueOrVideo =
      normBot.includes('video') ||
      normBot.includes('respiraci') ||
      normBot.includes('tecnica') ||
      normBot.includes('técnica') ||
      normBot.includes('ejercicio') ||
      normBot.includes('pausa') ||
      normBot.includes('calmar') ||
      normBot.includes('calma') ||
      normBot.includes('4-7-8') ||
      normBot.includes('4-4-4') ||
      normBot.includes('grounding') ||
      normBot.includes('jacobson') ||
      normBot.includes('stop');

    if (isExplicitVideo || (isAffirmative && botProposedTechniqueOrVideo)) {
      const exerciseToOpen = resolveExerciseFromHistory(lastBotMsg.text);
      setActiveVideoModal(exerciseToOpen);
    }
  };

  /**
   * Sugiere automáticamente comunicarse con canales de contención en Chile.
   */
  const promptEmergencyCallOptions = () => {
    Alert.alert(
      'Apoyo y Contención Inmediata 🇨🇱',
      'Tu bienestar es lo primero. ¿Deseas comunicarte ahora con una de las líneas de ayuda gratuitas y confidenciales en Chile?',
      [
        {
          text: '📞 Llamar al *4141 (MinSal)',
          onPress: () => handleCallEmergency('*4141'),
        },
        {
          text: '📞 Salud Responde (600 360 7777)',
          onPress: () => handleCallEmergency('6003607777'),
        },
        {
          text: 'Permanecer en el chat',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  /**
   * Procesa la respuesta de H.o.p.e o muestra alertas según el resultado.
   */
  const handleBotResponse = (res: { success: boolean; reply?: string; isCrisisAlert?: boolean; error?: string }): void => {
    if (res.success && res.reply) {
      const botMsg: DisplayMessage = {
        id: `bot-${Date.now()}`,
        sender: 'hope',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);

      const isEmergency = Boolean(res.isCrisisAlert || res.reply.includes('*4141') || res.reply.includes('Salud Responde'));
      if (isEmergency) {
        setHasCrisisAlert(true);
        promptEmergencyCallOptions();
      }
    } else {
      Alert.alert('Aviso', res.error || 'No se pudo conectar con H.o.p.e en este momento.');
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || loading) return;

    const userMsg: DisplayMessage = {
      id: `usr-${Date.now()}`,
      sender: 'paciente',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    tryOpenVideoByIntent(trimmed, messages);

    try {
      const res = await hopeService.sendMessage(trimmed);
      handleBotResponse(res);
    } catch (error) {
      console.error('❌ [Hope Message Error]:', error);
      Alert.alert('Error', 'Hubo una dificultad de red con el asistente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCallEmergency = (phoneNumber = '*4141') => {
    void Linking.openURL(`tel:${phoneNumber}`).catch((error) => {
      console.error('❌ [Call Error]: No se pudo abrir la aplicación de llamadas:', error);
    });
  };

  const renderMessageItem = ({ item, index }: { item: DisplayMessage; index: number }) => {
    const isBot = item.sender === 'hope';
    const exercises = getExercisesForMessage(item, index, messages);
    const isEmergencyMessage = isBot && (item.text.includes('*4141') || item.text.includes('Salud Responde'));

    return (
      <View style={[styles.messageRow, isBot ? styles.botRow : styles.patientRow]}>
        {isBot && (
          <View style={styles.botAvatarMini}>
            <Image
              source={require('../../../assets/h.o.p.e.png')}
              style={styles.avatarImgMini}
              resizeMode="contain"
            />
          </View>
        )}
        <View style={{ maxWidth: '85%' }}>
          <View style={[styles.bubble, isBot ? styles.botBubble : styles.patientBubble]}>
            <Text style={[styles.bubbleText, isBot ? styles.botText : styles.patientText]}>
              {item.text}
            </Text>
            {item.timestamp ? (
              <Text style={[styles.timeText, isBot ? styles.botTimeText : styles.patientTimeText]}>
                {item.timestamp}
              </Text>
            ) : null}
          </View>

          {isEmergencyMessage && (
            <EmergencyActionCard onCall={handleCallEmergency} />
          )}

          {exercises.map((ex) => (
            <ExerciseSuggestionCard
              key={ex.id}
              exercise={ex}
              onPlay={setActiveVideoModal}
              onOpenDetail={onOpenExerciseDetail}
              onNavigateTab={onNavigateTab}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Cabecera de H.o.p.e con estado verificado en tiempo real */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatarContainer}>
            <Image
              source={require('../../../assets/h.o.p.e.png')}
              style={styles.headerAvatar}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>H.o.p.e</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: getEngineStatusColor() },
                ]}
              />
              <Text style={styles.statusText}>{getEngineStatusLabel()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Banner de Crisis PAP (Solo si se activa riesgo) */}
      {hasCrisisAlert && (
        <View style={styles.crisisBanner}>
          <Ionicons name="alert-circle" size={24} color={COLORS.dangerText} />
          <View style={{ flex: 1 }}>
            <Text style={styles.crisisBannerTitle}>Canal de Emergencia *4141</Text>
            <Text style={styles.crisisBannerSubtitle}>
              Línea gratuita de ayuda y prevención disponible 24/7 en Chile.
            </Text>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={() => handleCallEmergency('*4141')}>
            <Text style={styles.callButtonText}>Llamar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Área del Chat con ajuste automático para teclado */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          style={styles.flexOne}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Indicador de "Escribiendo..." */}
        {loading && (
          <View style={styles.typingContainer}>
            <ActivityIndicator size="small" color={COLORS.greenPrimary} />
            <Text style={styles.typingText}>H.o.p.e está escribiendo con atención...</Text>
          </View>
        )}

        {/* Casilla de Entrada: visible en reposo sobre iconos y sobre el teclado al escribir */}
        <View
          style={[
            styles.inputBarContainer,
            { marginBottom: inputBottomMargin },
          ]}
        >
          <TextInput
            style={styles.textInput}
            placeholder="Escribe a H.o.p.e..."
            placeholderTextColor={COLORS.textSecondary}
            value={inputMessage}
            onChangeText={setInputMessage}
            onFocus={() => {
              setIsKeyboardVisible(true);
              if (Platform.OS === 'android' && keyboardHeight === 0) {
                setKeyboardHeight(290);
              }
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            multiline
            maxLength={600}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputMessage.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => void handleSendMessage()}
            disabled={!inputMessage.trim() || loading}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Barra de navegación inferior del paciente (se oculta suavemente al escribir para no estorbar el teclado) */}
      {!isKeyboardVisible && (
        <PatientBottomNav activeTab="chatbot" onNavigate={onNavigateTab} />
      )}

      {/* Modal de Reproducción de Video interactivo desde el Chat */}
      <Modal
        visible={Boolean(activeVideoModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveVideoModal(null)}
      >
        <View style={styles.videoModalBackdrop}>
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.videoModalBadge}>EJERCICIO RECOMENDADO</Text>
                <Text style={styles.videoModalTitle} numberOfLines={1}>
                  {activeVideoModal?.title}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeVideoButton}
                onPress={() => setActiveVideoModal(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.videoPlayerContainer}>
              {activeVideoModal && (
                <YoutubePlayer
                  height={205}
                  play={true}
                  videoId={activeVideoModal.videoId}
                />
              )}
            </View>

            <View style={styles.videoModalFooter}>
              <TouchableOpacity
                style={styles.openYouTubeButton}
                onPress={() => {
                  if (activeVideoModal?.videoId) {
                    void Linking.openURL(`https://www.youtube.com/watch?v=${activeVideoModal.videoId}`).catch((err) => {
                      console.error('❌ [YouTube Link Error]:', err);
                    });
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
                <Text style={styles.openYouTubeButtonText}>Abrir en YouTube</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.goToExerciseButton}
                onPress={() => {
                  const modalData = activeVideoModal;
                  setActiveVideoModal(null);
                  if (modalData && onOpenExerciseDetail) {
                    onOpenExerciseDetail(modalData.section, modalData.sectionTitle);
                  } else {
                    onNavigateTab('exercises');
                  }
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="open-outline" size={17} color="#374151" />
                <Text style={styles.goToExerciseButtonText}>
                  Ver en sección {activeVideoModal?.sectionTitle}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greenBorder,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.greenSurface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.greenBorder,
  },
  headerAvatar: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.greenPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  crisisBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 10,
  },
  crisisBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.dangerText,
  },
  crisisBannerSubtitle: {
    fontSize: 11.5,
    color: COLORS.dangerText,
    marginTop: 2,
  },
  callButton: {
    backgroundColor: COLORS.dangerText,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  chatArea: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    maxWidth: '85%',
  },
  botRow: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  patientRow: {
    alignSelf: 'flex-end',
  },
  botAvatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.greenSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 4,
  },
  avatarImgMini: {
    width: 20,
    height: 20,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  botBubble: {
    backgroundColor: COLORS.botBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  patientBubble: {
    backgroundColor: COLORS.patientBubble,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  botText: {
    color: COLORS.botText,
  },
  patientText: {
    color: COLORS.patientText,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  botTimeText: {
    color: COLORS.textSecondary,
  },
  patientTimeText: {
    color: '#D1FAE5',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  typingText: {
    fontSize: 12,
    color: COLORS.greenPrimary,
    fontStyle: 'italic',
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#1F2937',
    maxHeight: 90,
    paddingVertical: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.greenPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  // Tarjetas interactivas de ejercicios sugeridos por H.o.p.e
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  exerciseCardTag: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.greenPrimary,
    letterSpacing: 0.5,
  },
  exerciseCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  exerciseThumbnail: {
    width: 68,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  exerciseTextGroup: {
    flex: 1,
  },
  exerciseTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  exerciseTechnique: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  exerciseDuration: {
    fontSize: 11,
    color: COLORS.greenPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  exerciseActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  playInlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.greenPrimary,
    paddingVertical: 7,
    borderRadius: 8,
  },
  playInlineText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  redirectSectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingVertical: 7,
    borderRadius: 8,
  },
  redirectSectionText: {
    color: COLORS.greenPrimary,
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Modal de video de YouTube interactivo en el chat
  videoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  videoModalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  videoModalBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.greenPrimary,
    letterSpacing: 0.5,
  },
  videoModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  closeVideoButton: {
    padding: 4,
  },
  videoPlayerContainer: {
    backgroundColor: '#000000',
    width: '100%',
    height: 205,
    justifyContent: 'center',
  },
  videoModalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  openYouTubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF0000',
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 8,
  },
  openYouTubeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  goToExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    borderRadius: 10,
  },
  goToExerciseButtonText: {
    color: '#374151',
    fontSize: 12.5,
    fontWeight: '600',
  },
  // Tarjeta interactiva de llamada directa de emergencia PAP (Chile)
  emergencyCardContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  emergencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emergencyCardTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.6,
  },
  emergencyCardDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
  },
  emergencyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
  },
  emergencyActionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
  },
  emergencyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyActionTextGroup: {
    flex: 1,
  },
  emergencyActionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emergencyActionSubtitle: {
    fontSize: 10.5,
    color: '#FEE2E2',
    marginTop: 1,
  },
  emergencyActionSubtitleSecondary: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
});
