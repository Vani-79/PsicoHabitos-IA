import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PatientBottomNav, PatientTab } from '../components/PatientBottomNav';

interface PatientExercisesScreenProps {
  onBack: () => void;
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
}

export const PatientExercisesScreen: React.FC<PatientExercisesScreenProps> = ({
  onBack,
  onNavigateTab,
  userName = 'Paciente',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F613B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ejercicios y Respiraciones</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
      >
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="attach-outline"
              size={46}
              color="#0F613B"
              style={{ transform: [{ rotate: '-45deg' }] }}
            />
          </View>
          <Text style={styles.emptyTitle}>Recursos Asignados</Text>
          <Text style={styles.emptySubtitle}>
            En esta sección encontrarás ejercicios de respiración, relajación y tareas recomendadas por tu especialista para tu proceso terapéutico.
          </Text>
          <View style={styles.badgeInfo}>
            <Ionicons name="sparkles-outline" size={18} color="#475569" />
            <Text style={styles.badgeText}>Próximamente tu especialista cargará tus actividades.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Barra de navegación inferior */}
      <PatientBottomNav activeTab="exercises" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEBEB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D3D3D3',
    backgroundColor: '#EBEBEB',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  headerSpacer: { width: 32 },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E4EDE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  badgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  badgeText: { fontSize: 13, color: '#475569', fontWeight: '500' },
});
