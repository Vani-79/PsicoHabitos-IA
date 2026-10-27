import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { PatientBottomNav, PatientTab } from '../../components/Iconosbarrapaciente';
import {
  resourceService,
  PatientResourceItem,
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  getYouTubeDeepLink,
} from '../../services/resourceService';

const COLORS = {
  // Superficies
  screenBackground: '#EAF5EE',
  cardBackground: '#FFFFFF',
  cardBorder: '#D9ECDC',
  greenTint: '#DDF6E6',
  greenPill: '#EEF6F0',
  greenBorder: '#BFE4C9',
  activeBorder: '#10B981',

  // Texto
  greenPrimary: '#0F613B',
  greenDark: '#08482A',
  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',

  // Chips
  chipBg: '#E2E8F0',
  chipActiveBg: '#0F613B',
  chipActiveText: '#FFFFFF',
};

export type HabitSection =
  | 'ansiedad'
  | 'estres'
  | 'sueno'
  | 'ejercicio'
  | 'alimentacion'
  | 'hidratacion';

interface HabitDetailScreenProps {
  habitKey?: HabitSection;
  habitTitle?: string;
  onNavigateTab: (tab: PatientTab) => void;
}

const SECTION_OPTIONS: { key: HabitSection; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ansiedad', label: 'Ansiedad', icon: 'heart-outline' },
  { key: 'estres', label: 'Estrés', icon: 'leaf-outline' },
  { key: 'sueno', label: 'Sueño', icon: 'moon-outline' },
];

export const HabitDetailScreen: React.FC<HabitDetailScreenProps> = ({
  habitKey = 'ansiedad',
  habitTitle = 'Ansiedad',
  onNavigateTab,
}) => {
  const insets = useSafeAreaInsets();
  const [currentSection, setCurrentSection] = useState<HabitSection>(habitKey);
  const [resources, setResources] = useState<PatientResourceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeResource, setActiveResource] = useState<PatientResourceItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Carga de recursos desde el backend / base de datos
  const loadResources = useCallback(async (section: string) => {
    try {
      setLoading(true);
      const data = await resourceService.getResourcesBySection(section);
      setResources(data);
      // Si el recurso activo no pertenece a la nueva sección, lo cerramos
      setActiveResource((prev) => (prev?.seccion === section ? prev : null));
    } catch (err) {
      console.warn('[Ejerciciosvideos] Error cargando recursos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentSection(habitKey);
  }, [habitKey]);

  useEffect(() => {
    void loadResources(currentSection);
  }, [currentSection, loadResources]);

  const handleSelectVideo = (resource: PatientResourceItem) => {
    setActiveResource(resource);
    setIsPlaying(false); // Espera a que el paciente presione reproducir
  };

  const handleClosePlayer = () => {
    setActiveResource(null);
    setIsPlaying(false);
  };

  const currentSectionLabel =
    SECTION_OPTIONS.find((s) => s.key === currentSection)?.label || habitTitle;

  const renderResources = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.greenPrimary} />
          <Text style={styles.loadingText}>Cargando recursos terapéuticos...</Text>
        </View>
      );
    }

    if (resources.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="videocam-off-outline" size={44} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Próximamente</Text>
          <Text style={styles.emptyText}>
            Aún no hay videos registrados para esta sección.
          </Text>
        </View>
      );
    }

    return resources.map((item) => {
      const isCurrentlyActive = activeResource?.id === item.id;
      const thumbUrl = getYouTubeThumbnailUrl(item.video_url, item.miniatura_url);

      return (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.videoCard,
            isCurrentlyActive && styles.videoCardActive,
          ]}
          activeOpacity={0.88}
          onPress={() => handleSelectVideo(item)}
        >
          {/* Miniatura de YouTube */}
          <View style={styles.thumbnailWrapper}>
            <Image
              source={{ uri: thumbUrl }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            <View style={styles.playOverlay}>
              <Ionicons
                name={isCurrentlyActive ? 'pause-circle' : 'play-circle'}
                size={36}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Información del Ejercicio */}
          <View style={styles.videoInfo}>
            {/* TÍTULO ÚNICO EN VERDE */}
            <Text style={styles.videoTitleGreen} numberOfLines={2}>
              {item.tipo_tecnica || item.titulo}
            </Text>

            {/* Descripción */}
            <Text style={styles.videoDescription} numberOfLines={2}>
              {item.descripcion}
            </Text>

            {/* Acción de reproducción */}
            <View style={styles.metaRow}>
              <Text style={styles.watchText}>
                {isCurrentlyActive ? 'En reproducción' : 'Reproducir ▶'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Superior */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Recursos Clínicos</Text>
          <Text style={styles.headerSubtitle}>Técnicas y ejercicios en video</Text>
        </View>
      </View>

      {/* Selector de Sección / Filtro rápido */}
      <View style={styles.sectionTabs}>
        {SECTION_OPTIONS.map((item) => {
          const isActive = item.key === currentSection;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.sectionChip, isActive && styles.sectionChipActive]}
              onPress={() => setCurrentSection(item.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={isActive ? '#FFFFFF' : COLORS.textSecondary}
              />
              <Text
                style={[styles.sectionChipText, isActive && styles.sectionChipTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* REPRODUCTOR INTEGRADO IN-APP (SI HAY UN VIDEO SELECCIONADO) */}
        {activeResource && (
          <View style={styles.playerWrapper}>
            <View style={styles.playerHeader}>
              <View style={styles.playerBadge}>
                <Ionicons name="play-circle" size={16} color={COLORS.greenPrimary} />
                <Text style={styles.playerBadgeText}>Reproduciendo técnica</Text>
              </View>

              <TouchableOpacity
                onPress={handleClosePlayer}
                style={styles.closePlayerButton}
                activeOpacity={0.7}
                accessibilityLabel="Cerrar reproductor"
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Componente YouTube Embed con inicio exacto */}
            <View style={styles.youtubeContainer}>
              <YoutubePlayer
                height={210}
                play={isPlaying}
                videoId={extractYouTubeVideoId(activeResource.video_url)}
                initialPlayerParams={{
                  start: activeResource.segundo_inicio || 0,
                  end: activeResource.segundo_fin || undefined,
                  rel: false,
                  preventFullScreen: false,
                }}
              />
            </View>

            {/* Metadatos y detalles del video activo */}
            <View style={styles.playerMetaContainer}>
              {/* Título único en Verde */}
              <Text style={styles.playerTitleGreen}>
                {activeResource.tipo_tecnica || activeResource.titulo}
              </Text>

              {/* Indicador de segundo exacto / fragmento */}
              {activeResource.segundo_inicio > 0 && (
                <View style={styles.timestampBanner}>
                  <Ionicons name="time" size={14} color={COLORS.greenPrimary} />
                  <Text style={styles.timestampText}>
                    {activeResource.segundo_fin
                      ? `Fragmento guiado: ${Math.floor(activeResource.segundo_inicio / 60)}:${String(activeResource.segundo_inicio % 60).padStart(2, '0')} al ${Math.floor(activeResource.segundo_fin / 60)}:${String(activeResource.segundo_fin % 60).padStart(2, '0')}`
                      : `Comienza en el segundo exacto: ${activeResource.segundo_inicio}s`}
                  </Text>
                </View>
              )}

              <Text style={styles.playerDescription}>{activeResource.descripcion}</Text>

              {/* Opción para abrir en app nativa de YouTube si el usuario tiene Premium */}
              <TouchableOpacity
                style={styles.openYoutubeButton}
                onPress={() =>
                  Linking.openURL(
                    getYouTubeDeepLink(activeResource.video_url, activeResource.segundo_inicio)
                  )
                }
                activeOpacity={0.75}
              >
                <Ionicons name="logo-youtube" size={16} color="#DC2626" />
                <Text style={styles.openYoutubeText}>Abrir en la app de YouTube (Premium)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Banner de Presentación */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroBadge}>Ejercicios y Técnicas</Text>
              <Text style={styles.heroTitle}>{currentSectionLabel}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{resources.length} videos</Text>
            </View>
          </View>
          <Text style={styles.heroText}>
            Selecciona una técnica para reproducirla directamente aquí. Cada video está
            diseñado para acompañar tu proceso terapéutico.
          </Text>
        </View>

        {renderResources()}
      </ScrollView>

      {/* Barra de navegación inferior del paciente */}
      <PatientBottomNav activeTab="exercises" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBackground,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: COLORS.screenBackground,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.greenDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sectionTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  sectionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    gap: 6,
  },
  sectionChipActive: {
    backgroundColor: COLORS.greenPrimary,
    borderColor: COLORS.greenPrimary,
  },
  sectionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sectionChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: COLORS.greenTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenPrimary,
  },
  heroText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  playerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.activeBorder,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.greenPill,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenPrimary,
  },
  closePlayerButton: {
    padding: 4,
  },
  youtubeContainer: {
    backgroundColor: '#000000',
    width: '100%',
    minHeight: 210,
    justifyContent: 'center',
  },
  playerMetaContainer: {
    padding: 14,
  },
  playerTitleGreen: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.greenPrimary,
    marginBottom: 6,
  },
  timestampBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.greenTint,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenPrimary,
  },
  playerDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  openYoutubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  openYoutubeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  videoCardActive: {
    borderColor: COLORS.activeBorder,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  thumbnailWrapper: {
    width: 110,
    height: 85,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitleGreen: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.greenPrimary,
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  watchText: {
    fontSize: 11,
    color: COLORS.greenPrimary,
    fontWeight: '700',
  },
});
