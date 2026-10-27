import React, { useRef, memo } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PatientBottomNav, PatientTab } from '../../components/Iconosbarrapaciente';
import { HABIT_CATALOG } from '../../constants/habits';

// Iconos locales para conservar el mismo estilo visual que la pantalla.
const PlantIcon: React.FC<{ size?: number; color?: string }> = memo(({
  size = 18,
  color = COLORS.textDark,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <Path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </Svg>
));

const ChevronRightIcon: React.FC<{ size?: number; color?: string }> = memo(({
  size = 20,
  color = COLORS.chevron,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M9 18l6-6-6-6" />
  </Svg>
));

export type ExerciseHabitKey =
  | 'ansiedad'
  | 'estres'
  | 'sueno'
  | 'ejercicio'
  | 'alimentacion'
  | 'hidratacion';

interface HabitCardItem {
  id: number;
  habitKey: 'ansiedad' | 'sueno' | 'estres';
  title: string;
  description: string;
  image: ImageSourcePropType;
}

interface PatientExercisesScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  onOpenHabit?: (habitKey: ExerciseHabitKey, habitTitle: string) => void;
}

const COLORS = {
  // Superficies y texto
  screenBg: '#EAF5EE',
  cardBg: '#ffffff',
  cardBorder: '#dfe3e1',
  textDark: '#2F3A35',
  textTitle: '#1F2937',
  textSub: '#475569',
  textMuted: '#68736E',
  chevron: '#94A3B8',
  badgeBg: '#ddf5e3',
  divider: '#dfe3e1',

  // Fondos y bordes por hábito
  habitCardAnxietyBg: '#fde2e4b5',
  habitCardAnxietyBorder: '#d9778639',
  habitCardSleepBg: '#f0e7ffaf',
  habitCardSleepBorder: '#8962b836',
  habitCardStressBg: '#e3f0ffb5',
  habitCardStressBorder: '#4b84c42d',
};

const HABIT_CARDS: HabitCardItem[] = [
  {
    id: 1,
    habitKey: 'ansiedad',
    title: 'Ansiedad',
    description: 'Respira y recupera la calma.',
    image: HABIT_CATALOG.ansiedad.image!,
  },
  {
    id: 2,
    habitKey: 'sueno',
    title: 'Sueño',
    description: 'Prepara tu mente para descansar.',
    image: HABIT_CATALOG.sueno.image!,
  },
  {
    id: 3,
    habitKey: 'estres',
    title: 'Estrés',
    description: 'Libera tensión y vuelve al presente.',
    image: HABIT_CATALOG.estres.image!,
  },
];

const HABIT_CARD_COLORS = {
  ansiedad: {
    backgroundColor: COLORS.habitCardAnxietyBg,
    borderColor: COLORS.habitCardAnxietyBorder,
  },
  sueno: {
    backgroundColor: COLORS.habitCardSleepBg,
    borderColor: COLORS.habitCardSleepBorder,
  },
  estres: {
    backgroundColor: COLORS.habitCardStressBg,
    borderColor: COLORS.habitCardStressBorder,
  },
} satisfies Record<HabitCardItem['habitKey'], { backgroundColor: string; borderColor: string }>;

const HabitCard: React.FC<{
  item: HabitCardItem;
  onOpenHabit?: (habitKey: ExerciseHabitKey, habitTitle: string) => void;
}> = memo(({ item, onOpenHabit }) => {
  const pressAnimation = useRef(new Animated.Value(0)).current;
  const cardColors = HABIT_CARD_COLORS[item.habitKey];

  const animatePress = (toValue: number) => {
    Animated.spring(pressAnimation, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  };

  const translateY = pressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const scale = pressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });

  return (
    <Animated.View style={[styles.cardAnimated, { transform: [{ translateY }, { scale }] }]}>
      <TouchableOpacity
        style={[styles.card, cardColors]}
        activeOpacity={1}
        onPressIn={() => animatePress(1)}
        onPressOut={() => animatePress(0)}
        onPress={() => onOpenHabit?.(item.habitKey, item.title)}
      >
        <View style={styles.imageFrame}>
          <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.cardSubtitle}>Ver prácticas</Text>
        </View>

        <View style={styles.chevronContainer}>
          <ChevronRightIcon size={20} color={COLORS.chevron} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const PatientExercisesScreen: React.FC<PatientExercisesScreenProps> = ({
  onNavigateTab,
  onOpenHabit,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
      >
        <View style={styles.introHeader}>
          <Text style={styles.introTitle}>¿Qué quieres trabajar hoy?</Text>
          <Text style={styles.introText}>
            Elige un área y encuentra una práctica breve.
          </Text>
        </View>

        {/* Contenedor de Áreas para trabajar */}
        <View style={styles.gridContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <PlantIcon size={18} color={COLORS.textDark} />
            </View>
            <View style={styles.headerTextGroup}>
              <View style={styles.titleRow}>
                <Text style={styles.sectionTitle}>Áreas para trabajar</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{HABIT_CARDS.length} áreas</Text>
                </View>
              </View>
              <Text style={styles.sectionSubText}>Selecciona una opción para comenzar</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {HABIT_CARDS.map((item) => (
            <HabitCard key={item.id} item={item} onOpenHabit={onOpenHabit} />
          ))}
        </View>
      </ScrollView>

      {/* Navegación Inferior */}
      <PatientBottomNav activeTab="exercises" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },

  /* Encabezado e introducción */
  introHeader: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
  },

  /* Sección de hábitos */
  gridContainer: {
    width: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.badgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  sectionSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: COLORS.screenBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginTop: -4,
    marginBottom: 2,
  },

  /* Tarjetas de hábitos */
  cardAnimated: {
    width: '100%',
    marginTop: 10,
  },
  card: {
    minHeight: 92,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageFrame: {
    width: 66,
    height: 66,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textTitle,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSub,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSub,
    fontWeight: '700',
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 6,
  },
});