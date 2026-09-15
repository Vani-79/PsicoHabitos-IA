import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PatientBottomNav, PatientTab } from '../../components/PatientBottomNav';

export type HabitSection =
  | 'ansiedad'
  | 'estres'
  | 'sueno'
  | 'ejercicio'
  | 'alimentacion'
  | 'hidratacion';

type HabitResource = {
  id: number;
  title: string;
  description: string;
  duration: string;
  videoUrl: string;
  type: string;
};

const anxietyResources: HabitResource[] = [
  {
    id: 1,
    title: 'Respiración 4-6 para calmar la activación',
    description:
      'Técnica breve para bajar la ansiedad fisiológica y recuperar la calma en momentos de tensión.',
    duration: '2:30',
    videoUrl: 'https://example.com/ansiedad-respiracion.mp4',
    type: 'Respiración',
  },
  {
    id: 2,
    title: 'Grounding 5-4-3-2-1',
    description:
      'Ejercicio para volver al presente y reducir pensamientos acelerados cuando la mente se dispara.',
    duration: '3:10',
    videoUrl: 'https://example.com/ansiedad-grounding.mp4',
    type: 'Grounding',
  },
];

const habitResourcesBySection: Record<HabitSection, HabitResource[]> = {
  ansiedad: anxietyResources,
  estres: [],
  sueno: [],
  ejercicio: [],
  alimentacion: [],
  hidratacion: [],
};

interface HabitDetailScreenProps {
  habitKey?: HabitSection;
  habitTitle?: string;
  onBack: () => void;
  onNavigateTab: (tab: PatientTab) => void;
}

export const HabitDetailScreen: React.FC<HabitDetailScreenProps> = ({
  habitKey = 'ansiedad',
  habitTitle = 'Ansiedad',
  onBack,
  onNavigateTab,
}) => {
  const insets = useSafeAreaInsets();
  const resources = habitResourcesBySection[habitKey] ?? [];

  const openVideo = async (videoUrl: string) => {
    await Linking.openURL(videoUrl);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F613B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{habitTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>Recomendado para hoy</Text>
          <Text style={styles.heroTitle}>{habitTitle}</Text>
          <Text style={styles.heroText}>
            Practica estas dos herramientas cortas para apoyar la regulación emocional y reducir la activación.
          </Text>
        </View>

        {resources.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Próximamente</Text>
            <Text style={styles.emptyText}>Aún no hay recursos disponibles para este hábito.</Text>
          </View>
        ) : (
          resources.map((resource) => (
            <TouchableOpacity
              key={resource.id}
              style={styles.videoCard}
              activeOpacity={0.88}
              onPress={() => openVideo(resource.videoUrl)}
            >
              <View style={styles.videoThumb}>
                <Ionicons name="play-circle" size={42} color="#0F613B" />
              </View>

              <View style={styles.videoInfo}>
                <Text style={styles.videoType}>{resource.type}</Text>
                <Text style={styles.videoTitle}>{resource.title}</Text>
                <Text style={styles.videoDescription}>{resource.description}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="time-outline" size={14} color="#475569" />
                    <Text style={styles.metaText}>{resource.duration}</Text>
                  </View>
                  <Text style={styles.watchText}>Ver video</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EEE8',
    backgroundColor: '#F8FBF9',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  headerSpacer: { width: 32 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroCard: {
    backgroundColor: '#F7FCF8',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D9ECDC',
    marginBottom: 18,
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F613B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    color: '#5B6473',
    lineHeight: 20,
  },
  videoCard: {
    backgroundColor: '#F7FCF8',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5F0E7',
    marginBottom: 14,
  },
  videoThumb: {
    width: 92,
    height: 92,
    borderRadius: 16,
    backgroundColor: '#DDF6E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F613B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  videoDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#5B6473',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF6F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  watchText: {
    fontSize: 12,
    color: '#0F613B',
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#F7FCF8',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5F0E7',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#5B6473',
    textAlign: 'center',
  },
});
