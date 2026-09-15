import React, { useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PatientBottomNav, PatientTab } from '../../components/PatientBottomNav';
import { HABIT_CATALOG } from '../../constants/habits';

interface PatientExercisesScreenProps {
  onBack?: () => void;
  onNavigateTab: (tab: PatientTab) => void;
  onOpenHabit?: (habitKey: 'ansiedad' | 'estres' | 'sueno' | 'ejercicio' | 'alimentacion' | 'hidratacion', habitTitle: string) => void;
  userName?: string;
}

const habitCards = [
  { id: 1, title: 'Ansiedad', description: 'Respira y recupera la calma.', color: '#FDE2E4', borderColor: '#D97786', image: HABIT_CATALOG.ansiedad.image! },
  { id: 2, title: 'Sueño', description: 'Prepara tu mente para descansar.', color: '#F0E7FF', borderColor: '#8962B8', image: HABIT_CATALOG.sueno.image! },
  { id: 3, title: 'Estrés', description: 'Libera tensión y vuelve al presente.', color: '#E3F0FF', borderColor: '#4B83C4', image: HABIT_CATALOG.estres.image! },
];

const HabitCard: React.FC<{ item: (typeof habitCards)[number]; onOpenHabit?: (habitKey: 'ansiedad' | 'estres' | 'sueno' | 'ejercicio' | 'alimentacion' | 'hidratacion', habitTitle: string) => void }> = ({ item, onOpenHabit }) => {
  const pressAnimation = useRef(new Animated.Value(0)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(pressAnimation, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardAnimated,
        {
          transform: [
            {
              translateY: pressAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -12],
              }),
            },
            {
              scale: pressAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.02],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.card, { backgroundColor: item.color, borderColor: item.borderColor }]}
        activeOpacity={1}
        onPressIn={() => animatePress(1)}
        onPressOut={() => animatePress(0)}
        onPress={() => onOpenHabit?.(item.title.toLowerCase().replace(/\s+/g, '-') === 'comida' ? 'alimentacion' : item.title.toLowerCase().replace(/\s+/g, '-') === 'hidratación' ? 'hidratacion' : item.title.toLowerCase().replace(/\s+/g, '-') === 'estrés' ? 'estres' : item.title.toLowerCase().replace(/\s+/g, '-') === 'sueño' ? 'sueno' : item.title.toLowerCase().replace(/\s+/g, '-') === 'ejercicio' ? 'ejercicio' : 'ansiedad', item.title)}
      >
        <View style={styles.imageFrame}>
          <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.cardSubtitle}>Ver videos</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const PatientExercisesScreen: React.FC<PatientExercisesScreenProps> = ({
  onBack,
  onNavigateTab,
  onOpenHabit,
  userName = 'Paciente',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ejercicios y Respiraciones</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
      >
        <View style={styles.introContainer}>
          <Text style={styles.introTitle}>¿Qué quieres trabajar hoy?</Text>
          <Text style={styles.introText}>Elige un área y encuentra una práctica breve para sentirte mejor.</Text>
        </View>

        <View style={styles.gridContainer}>
          {habitCards.map((item) => (
            <HabitCard key={item.id} item={item} onOpenHabit={onOpenHabit} />
          ))}
        </View>
      </ScrollView>

      <PatientBottomNav activeTab="exercises" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAF5EE' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EEE8',
    backgroundColor: '#F8FBF9',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  introContainer: {
    marginBottom: 18,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  introText: {
    fontSize: 14,
    color: '#5B6473',
    lineHeight: 20,
  },
  gridContainer: {
    flexDirection: 'column',
    gap: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    paddingTop: 28,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#E9EEF0',
  },
  cardAnimated: {
    width: '100%',
  },
  card: {
    minHeight: 108,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  imageFrame: {
    width: 96,
    height: 82,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
    marginTop: 5,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
    marginTop: 10,
    alignSelf: 'flex-end',
  },
});
