import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PatientBottomNav,
  PatientTab,
} from '../../components/PatientBottomNav';

interface PatientCalendarScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
}

export const PatientCalendarScreen: React.FC<PatientCalendarScreenProps> = ({
  onNavigateTab,
  userName = 'Paciente',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 80, 100),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* TARJETA DE INTRODUCCIÓN */}
        <View style={styles.introCard}>
          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Tus sesiones
            </Text>

            <Text style={styles.introText}>
              Revisa tus próximas citas y consulta el historial de tus sesiones.
            </Text>
          </View>
        </View>

        {/* PRÓXIMAS CITAS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Próximas citas
          </Text>

          <View style={styles.emptyState}>
            <View style={styles.smallIconCircle}>
              <Ionicons
                name="calendar-outline"
                size={30}
                color="#0F613B"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No tienes citas próximas
            </Text>

            <Text style={styles.emptySubtitle}>
              Cuando tengas una sesión programada, aparecerá aquí.
            </Text>
          </View>
        </View>

        {/* HISTORIAL */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Historial
          </Text>

          <View style={styles.emptyState}>
            <View style={styles.smallIconCircle}>
              <Ionicons
                name="time-outline"
                size={30}
                color="#64748B"
              />
            </View>

            <Text style={styles.emptyTitle}>
              Sin sesiones registradas
            </Text>

            <Text style={styles.emptySubtitle}>
              Aquí podrás consultar tus sesiones anteriores.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* BARRA DE NAVEGACIÓN INFERIOR */}
      <PatientBottomNav
        activeTab="calendar"
        onNavigate={onNavigateTab}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF5EE',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // ─────────────────────────────
  // TARJETA DE INTRODUCCIÓN
  // ─────────────────────────────

  introCard: {
  backgroundColor: '#F4F8F5',
  borderRadius: 20,
  paddingVertical: 18,
  paddingHorizontal: 18,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#D5E2D9',
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2F3A35',
    marginBottom: 5,
  },

  introText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#68736E',
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E4F0E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },

  introEmoji: {
    fontSize: 25,
  },

  // ─────────────────────────────
  // SECCIONES
  // ─────────────────────────────

  sectionCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 18,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: '#DDE6E1',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2F3A35',
    marginBottom: 14,
  },

  // ─────────────────────────────
  // ESTADO VACÍO
  // ─────────────────────────────

  emptyState: {
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },

  smallIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E4F0E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 5,
    textAlign: 'center',
  },

  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#68736E',
    textAlign: 'center',
  },
});