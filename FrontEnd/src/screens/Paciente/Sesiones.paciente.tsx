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

import { formatToChileanDate } from '../../utils/date';

interface PatientCalendarScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
}

const renderSpecialistBadge = (tipo?: string) => {
  if (tipo === 'suplente') {
    return (
      <View style={styles.badgeSuplente}>
        <Ionicons name="repeat" size={11} color="#1D4ED8" style={{ marginRight: 3 }} />
        <Text style={styles.badgeSuplenteText}>Ps. Suplente</Text>
      </View>
    );
  }
  if (tipo === 'titular_anterior') {
    return (
      <View style={styles.badgeAnterior}>
        <Ionicons name="time-outline" size={11} color="#475569" style={{ marginRight: 3 }} />
        <Text style={styles.badgeAnteriorText}>Ps. Titular Anterior</Text>
      </View>
    );
  }
  return (
    <View style={styles.badgeTitular}>
      <Ionicons name="shield-checkmark" size={11} color="#0F613B" style={{ marginRight: 3 }} />
      <Text style={styles.badgeTitularText}>Ps. Titular Actual</Text>
    </View>
  );
};

const getCardAccentStyle = (tipo?: string) => {
  if (tipo === 'suplente') {
    return styles.cardAccentSuplente;
  }
  if (tipo === 'titular_anterior') {
    return styles.cardAccentAnterior;
  }
  return styles.cardAccentTitular;
};

export const PatientCalendarScreen: React.FC<PatientCalendarScreenProps> = ({
  onNavigateTab,
}) => {
  const ITEMS_PER_PAGE = 3; // Número de elementos por página
  const [currentPage, setCurrentPage] = useState(1);
  const insets = useSafeAreaInsets();
  const [proximas, setProximas] = useState<AppointmentSession[]>([]);
  const [historial, setHistorial] = useState<AppointmentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getMySessions();
      setProximas(data.proximas);
      setHistorial(data.historial);
      setCurrentPage(1); // Reiniciar a página 1 al cargar
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await appointmentService.getMySessions();
      setProximas(data.proximas);
      setHistorial(data.historial);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error al refrescar sesiones:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // CÁLCULOS DE PAGINACIÓN DE HISTORIAL
  const totalPages = Math.ceil(historial.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentHistorial = historial.slice(indexOfFirstItem, indexOfLastItem);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
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
                  <View key={item.id} style={[styles.upcomingCard, getCardAccentStyle(item.tipoEspecialista)]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.dateBadge}>
                        <Ionicons name="calendar" size={14} color="#0F613B" style={{ marginRight: 5 }} />
                        <Text style={styles.dateBadgeText}>{formatToChileanDate(item.fecha)}</Text>
                      </View>

                      {renderSpecialistBadge(item.tipoEspecialista)}
                    </View>

                    <Text style={styles.cardTimeText}>
                      Hora: {item.hora}{item.horaFin ? ` - ${item.horaFin}` : ''}
                    </Text>

                    {item.doctorNombre ? (
                      <View style={styles.doctorRow}>
                        <Ionicons name="person-outline" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                        <Text style={styles.doctorText}>
                          Especialista:{' '}
                          <Text style={{ fontWeight: '700', color: '#1F2937' }}>{item.doctorNombre}</Text>
                        </Text>
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
                      <View
                        style={[
                          styles.modalityPill,
                          item.modalidad?.toLowerCase() === 'online' ? styles.modalityPillOnline : styles.modalityPillPresencial,
                        ]}
                      >
                        <Ionicons
                          name={item.modalidad?.toLowerCase() === 'online' ? 'videocam' : 'business'}
                          size={12}
                          color={item.modalidad?.toLowerCase() === 'online' ? '#2563EB' : '#0F613B'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.modalityPillText,
                            item.modalidad?.toLowerCase() === 'online' ? styles.modalityPillTextOnline : styles.modalityPillTextPresencial,
                          ]}
                        >
                          {item.modalidad?.toLowerCase() === 'online' ? 'Online' : 'Presencial'}
                        </Text>
                      </View>

                      <View style={styles.statusBadgeUpcoming}>
                        <Text style={styles.statusBadgeTextUpcoming}>Programada</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* HISTORIAL CON PAGINACIÓN */}
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
                <>
                  {/* Se mapean únicamente los elementos recortados por la página actual */}
                  {currentHistorial.map((item) => (
                    <View key={item.id} style={[styles.historyCard, getCardAccentStyle(item.tipoEspecialista)]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.dateBadge}>
                          <Ionicons name="calendar" size={14} color="#0F613B" style={{ marginRight: 5 }} />
                          <Text style={styles.dateBadgeText}>{formatToChileanDate(item.fecha)}</Text>
                        </View>

                        {renderSpecialistBadge(item.tipoEspecialista)}
                      </View>

                      <Text style={styles.cardTimeText}>
                        Hora: {item.hora}{item.horaFin ? ` - ${item.horaFin}` : ''}
                      </Text>

                      {item.doctorNombre ? (
                        <View style={styles.doctorRow}>
                          <Ionicons name="person-outline" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                          <Text style={styles.doctorText}>
                            Atendió:{' '}
                            <Text style={{ fontWeight: '700', color: '#1F2937' }}>{item.doctorNombre}</Text>
                          </Text>
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

                      <View style={styles.historyFooterRow}>
                        <View
                          style={[
                            styles.modalityPill,
                            item.modalidad?.toLowerCase() === 'online' ? styles.modalityPillOnline : styles.modalityPillPresencial,
                          ]}
                        >
                          <Ionicons
                            name={item.modalidad?.toLowerCase() === 'online' ? 'videocam' : 'business'}
                            size={12}
                            color={item.modalidad?.toLowerCase() === 'online' ? '#2563EB' : '#0F613B'}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.modalityPillText,
                              item.modalidad?.toLowerCase() === 'online' ? styles.modalityPillTextOnline : styles.modalityPillTextPresencial,
                            ]}
                          >
                            {item.modalidad?.toLowerCase() === 'online' ? 'Online' : 'Presencial'}
                          </Text>
                        </View>

                        {item.estado === 'Cancelada' ? (
                          <View style={styles.statusBadgeCancelled}>
                            <Text style={styles.statusBadgeTextCancelled}>Cancelada</Text>
                          </View>
                        ) : (
                          <View style={styles.statusBadgeCompleted}>
                            <Text style={styles.statusBadgeTextCompleted}>Completada</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}

                  {/* CONTROLES DE PAGINACIÓN */}
                  {totalPages > 1 && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                        onPress={handlePrevPage}
                        disabled={currentPage === 1}
                      >
                        <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? '#9CA3AF' : '#0F613B'} />
                        <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                          Anterior
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.paginationInfoText}>
                        Página {currentPage} de {totalPages}
                      </Text>

                      <TouchableOpacity
                        style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                        onPress={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                          Siguiente
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? '#9CA3AF' : '#0F613B'} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
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
    width: '100%',
    flex: 1,
    backgroundColor: '#EAF5EE',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
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

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e3e8e5',
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
    color: '#40444f',
    
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
  },

  cardAccentTitular: {
    borderLeftWidth: 6,
    borderLeftColor: '#46c0af61',
  },
  cardAccentSuplente: {
    borderLeftWidth: 4.5,
    borderLeftColor: '#a5abb7',
  },
  cardAccentAnterior: {
    borderLeftWidth: 4.5,
    borderLeftColor: '#47a871',
  },
  badgeTitular: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbc8c8',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  badgeTitularText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#3a3b3b',
  },
  badgeSuplente: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  badgeSuplenteText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  badgeAnterior: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  badgeAnteriorText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
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
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3a3b3b',
  },
  modalityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  modalityPillPresencial: {
    backgroundColor: '#7c7f8023',
  },
  modalityPillOnline: {
    backgroundColor: '#EFF6FF',
  },
  modalityPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalityPillTextPresencial: {
    color: '#4e5053',
  },
  modalityPillTextOnline: {
    color: '#4e5053',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadgeUpcoming: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusBadgeTextUpcoming: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#92400E',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadgeCompleted: {
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusBadgeTextCompleted: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F613B',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusBadgeTextCancelled: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
  },

  /* ESTILOS DE PAGINACIÓN */
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    backgroundColor: '#FFF',
  },
  paginationButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  paginationButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#181e1b',
  },
  paginationButtonTextDisabled: {
    color: '#9CA3AF',
  },
  paginationInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
});