import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PatientBottomNav,
  PatientTab,
} from '../../components/PatientBottomNav';
import { appointmentService } from '../../services/appointmentService';
import { AppointmentSession } from '../../types/patient';

interface PatientCalendarScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
}

export const PatientCalendarScreen: React.FC<PatientCalendarScreenProps> = ({
  onNavigateTab,
  userName = 'Paciente',
}) => {
  const insets = useSafeAreaInsets();
  const [proximas, setProximas] = useState<AppointmentSession[]>([]);
  const [historial, setHistorial] = useState<AppointmentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    const data = await appointmentService.getMySessions();
    setProximas(data.proximas);
    setHistorial(data.historial);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const data = await appointmentService.getMySessions();
    setProximas(data.proximas);
    setHistorial(data.historial);
    setRefreshing(false);
  };

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F613B']} />
        }
      >
        {/* TARJETA DE INTRODUCCIÓN */}
        <View style={styles.introCard}>
          <View style={styles.introContent}>
            <Text style={styles.introTitle}>Tus sesiones</Text>
            <Text style={styles.introText}>
              Hola {userName}, revisa tus próximas citas y consulta el historial de todas tus sesiones clínicas.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0F613B" />
            <Text style={styles.loadingText}>Cargando tus citas...</Text>
          </View>
        ) : (
          <>
            {/* PRÓXIMAS CITAS */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Próximas citas</Text>
                {proximas.length > 0 && (
                  <View style={styles.countBadgeUpcoming}>
                    <Text style={styles.countBadgeTextUpcoming}>{proximas.length}</Text>
                  </View>
                )}
              </View>

              {proximas.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.smallIconCircle}>
                    <Ionicons name="calendar-outline" size={28} color="#0F613B" />
                  </View>
                  <Text style={styles.emptyTitle}>No tienes citas próximas</Text>
                  <Text style={styles.emptySubtitle}>
                    Cuando tu especialista programe una nueva sesión, aparecerá reflejada aquí.
                  </Text>
                </View>
              ) : (
                proximas.map((item) => (
                  <View key={item.id} style={styles.upcomingCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.dateBadge}>
                        <Ionicons name="calendar" size={14} color="#0F613B" style={{ marginRight: 5 }} />
                        <Text style={styles.dateBadgeText}>{item.fecha}</Text>
                      </View>

                      <View
                        style={[
                          styles.modalityPill,
                          item.modalidad === 'online' ? styles.modalityPillOnline : styles.modalityPillPresencial,
                        ]}
                      >
                        <Ionicons
                          name={item.modalidad === 'online' ? 'videocam' : 'business'}
                          size={12}
                          color={item.modalidad === 'online' ? '#2563EB' : '#0F613B'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.modalityPillText,
                            item.modalidad === 'online' ? styles.modalityPillTextOnline : styles.modalityPillTextPresencial,
                          ]}
                        >
                          {item.modalidad === 'online' ? 'Online' : 'Presencial'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardTimeText}>
                      Hora: {item.hora} {item.horaFin ? `- ${item.horaFin}` : ''} ({item.duracion})
                    </Text>

                    {item.doctorNombre ? (
                      <View style={styles.doctorRow}>
                        <Ionicons name="person-outline" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                        <Text style={styles.doctorText}>Especialista: {item.doctorNombre}</Text>
                      </View>
                    ) : null}

                    {item.observaciones ? (
                      <View style={styles.observationsBox}>
                        <Ionicons name="document-text-outline" size={13} color="#4B5563" style={{ marginRight: 4, marginTop: 1 }} />
                        <Text style={styles.observationsText}>
                          {item.observaciones}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.cardFooter}>
                      <View style={styles.statusBadgeUpcoming}>
                        <Text style={styles.statusBadgeTextUpcoming}>Programada</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* HISTORIAL */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Historial de sesiones</Text>
                {historial.length > 0 && (
                  <View style={styles.countBadgeHistory}>
                    <Text style={styles.countBadgeTextHistory}>{historial.length}</Text>
                  </View>
                )}
              </View>

              {historial.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.smallIconCircle}>
                    <Ionicons name="time-outline" size={28} color="#64748B" />
                  </View>
                  <Text style={styles.emptyTitle}>Sin sesiones registradas</Text>
                  <Text style={styles.emptySubtitle}>
                    Aquí podrás consultar todas tus sesiones anteriores ya realizadas.
                  </Text>
                </View>
              ) : (
                historial.map((item) => (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.historyDate}>
                        {item.fecha} · {item.hora} {item.horaFin ? `- ${item.horaFin}` : ''} · {item.duracion}
                      </Text>

                      <View style={styles.statusBadgeCompleted}>
                        <Text style={styles.statusBadgeTextCompleted}>Completada</Text>
                      </View>
                    </View>

                    <View style={styles.historyMetaRow}>
                      <Ionicons
                        name={item.modalidad === 'online' ? 'videocam-outline' : 'business-outline'}
                        size={13}
                        color="#6B7280"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.historyModalityText}>
                        Modalidad: {item.modalidad === 'online' ? 'Online' : 'Presencial'}
                      </Text>
                    </View>

                    {item.observaciones ? (
                      <Text style={styles.historyNotesText}>
                        {item.observaciones}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </>
        )}
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
    paddingTop: 16,
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
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D5E2D9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  introContent: {
    flex: 1,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },
  introText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#4B5563',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DDE6E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#111827',
  },
  countBadgeUpcoming: {
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  countBadgeTextUpcoming: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F613B',
  },
  countBadgeHistory: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeTextHistory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  smallIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E4F0E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  upcomingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: '#0F613B',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F613B',
  },
  modalityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  modalityPillPresencial: {
    backgroundColor: '#EAF5EE',
  },
  modalityPillOnline: {
    backgroundColor: '#EFF6FF',
  },
  modalityPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalityPillTextPresencial: {
    color: '#0F613B',
  },
  modalityPillTextOnline: {
    color: '#2563EB',
  },
  cardTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  doctorText: {
    fontSize: 12.5,
    color: '#4B5563',
  },
  observationsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 6,
  },
  observationsText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  statusBadgeUpcoming: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeTextUpcoming: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#92400E',
  },
  historyCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyDate: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadgeCompleted: {
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeTextCompleted: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F613B',
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  historyModalityText: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyNotesText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    marginTop: 2,
  },
});