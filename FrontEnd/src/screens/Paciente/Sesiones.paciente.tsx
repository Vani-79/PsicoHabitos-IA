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
} from '../../components/Iconosbarrapaciente';
import { appointmentService } from '../../services/appointmentService';
import { AppointmentSession } from '../../types/patient';
import { formatToChileanDate } from '../../utils/date';

const COLORS = {
  // Base visual
  primary: '#9099a3',
  primaryBg: '#D1FAE5',
  screenBg: '#EAF5EE',
  white: '#FFFFFF',
  emptyBg: '#ddf5e37a',

  // Texto
  textDark: '#1c2233',
  textMain: '#D97706',
  textSecondary: '#020203',
  textHighlight: '#020203',

  // Bordes
  borderLight: '#dfe3e1',
  borderCard: '#0b6d3744',
  borderGray: '#ede9e9',
  borderButton: '#D1D5DB',

  // Especialistas y modalidad
  titularText: '#3a3b3b',
  suplenteText: '#1D4ED8',
  anteriorText: '#475569',
  modalityText: '#070404',
  modalityIconOnline: '#316deeb8',
  modalityIconPresencial: '#05966894',

  // Estados y paginación
  statusScheduledBg: '#E0F2FE',
  statusScheduledText: '#0369A1',
  statusCompletedBg: '#dcfce7',
  statusCompletedText: '#15803D',
  statusCancelledBg: '#FEE2E2',
  statusCancelledText: '#B91C1C',
  disabledBg: '#F3F4F6',
  disabledText: '#9CA3AF',
};

const ITEMS_PER_PAGE = 3;

interface PatientCalendarScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
}

const renderSpecialistBadge = (tipo?: string) => {
  if (tipo === 'suplente') {
    return (
      <View style={[styles.badgeBase,]}>
        <Ionicons name="repeat" size={11} color={COLORS.suplenteText} style={{ marginRight: 3 }} />
        <Text style={[styles.badgeTextBase, styles.badgeSuplenteText]}>Ps. Suplente</Text>
      </View>
    );
  }
  if (tipo === 'titular_anterior') {
    return (
      <View style={[styles.badgeBase,]}>
        <Ionicons name="time-outline" size={11} color={COLORS.anteriorText} style={{ marginRight: 3 }} />
        <Text style={[styles.badgeTextBase, styles.badgeAnteriorText]}>Ps. Titular Anterior</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badgeBase, styles.badgeTitular]}>
      <Ionicons name="shield-checkmark" size={11} color={COLORS.primary} style={{ marginRight: 3 }} />
      <Text style={[styles.badgeTextBase, styles.badgeTitularText]}>Ps. Titular Actual</Text>
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
      setCurrentPage(1);
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

  // Paginación del Historial
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
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
                    <Ionicons name="calendar-outline" size={28} color={COLORS.primary} />
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
                        <Ionicons name="calendar" size={14} color={COLORS.primary} style={{ marginRight: 5 }} />
                        <Text style={styles.dateBadgeText}>{formatToChileanDate(item.fecha)}</Text>
                      </View>

                      {renderSpecialistBadge(item.tipoEspecialista)}
                    </View>

                    <Text style={styles.cardTimeText}>
                      Hora: {item.hora}{item.horaFin ? ` - ${item.horaFin}` : ''}
                    </Text>

                    {item.doctorNombre ? (
                      <View style={styles.doctorRow}>
                        <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.doctorText}>
                          Especialista:{' '}
                          <Text style={styles.doctorNameBold}>{item.doctorNombre}</Text>
                        </Text>
                      </View>
                    ) : null}



                    <View style={styles.cardFooter}>
                      <View style={styles.modalityPill}>
                        <Ionicons
                          name={item.modalidad?.toLowerCase() === 'online' ? 'videocam' : 'business'}
                          size={12}
                          color={item.modalidad?.toLowerCase() === 'online' ? COLORS.modalityIconOnline : COLORS.modalityIconPresencial}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.modalityPillText}>
                          {item.modalidad?.toLowerCase() === 'online' ? 'Online' : 'Presencial'}
                        </Text>
                      </View>

                      <View style={[styles.statusBadgeBase, styles.statusBadgeUpcoming]}>
                        <Text style={[styles.statusBadgeTextBase, styles.statusBadgeTextUpcoming]}>Programada</Text>
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
                    <Ionicons name="time-outline" size={28} />
                  </View>
                  <Text style={styles.emptyTitle}>Sin sesiones registradas</Text>
                  <Text style={styles.emptySubtitle}>
                    Aquí podrás consultar todas tus sesiones anteriores ya realizadas.
                  </Text>
                </View>
              ) : (
                <>
                  {currentHistorial.map((item) => (
                    <View key={item.id} style={[styles.historyCard, getCardAccentStyle(item.tipoEspecialista)]}>

                      {/* ENCABEZADO: FECHA + ESTADO */}
                      <View style={styles.historyCardHeader}>
                        <View>
                          <Text style={styles.historyDateText}>{formatToChileanDate(item.fecha)}</Text>
                          <Text style={styles.historyTimeText}>
                            {item.hora}{item.horaFin ? ` - ${item.horaFin}` : ''} hrs
                          </Text>
                        </View>

                        {/* Estado claro y sin saturar */}
                        {item.estado === 'Cancelada' ? (
                          <View style={[styles.statusBadgeBase, styles.statusBadgeCancelled]}>
                            <Text style={[styles.statusBadgeTextBase, styles.statusBadgeTextCancelled]}>Cancelada</Text>
                          </View>
                        ) : (
                          <View style={[styles.statusBadgeBase, styles.statusBadgeCompleted]}>
                            <Text style={[styles.statusBadgeTextBase, styles.statusBadgeTextCompleted]}>Completada</Text>
                          </View>
                        )}
                      </View>

                      {/* CUERPO: ESPECIALISTA Y TIPO */}
                      {item.doctorNombre ? (
                        <View style={styles.historyDoctorRow}>
                          <Text style={styles.historyDoctorText}>
                            Atendió: <Text style={styles.doctorNameBold}>{item.doctorNombre}</Text>
                          </Text>
                          {renderSpecialistBadge(item.tipoEspecialista)}
                        </View>
                      ) : null}


                      {/* PIE: MODALIDAD */}
                      <View style={styles.historyFooterRow}>
                        <View style={styles.modalityPill}>
                          <Ionicons
                            name={item.modalidad?.toLowerCase() === 'online' ? 'videocam' : 'business'}
                            size={13}
                            color={
                              item.modalidad?.toLowerCase() === 'online'
                                ? COLORS.modalityIconOnline
                                : COLORS.modalityIconPresencial
                            }
                            style={{ marginRight: 5 }}
                          />
                          <Text style={styles.modalityPillText}>
                            Modalidad {item.modalidad?.toLowerCase() === 'online' ? 'Online' : 'Presencial'}
                          </Text>
                        </View>
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
                        <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? COLORS.disabledText : COLORS.primary} />
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
                        <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? COLORS.disabledText : COLORS.primary} />
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
      <PatientBottomNav activeTab="calendar" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
};

// ============================================================================
// HOJA DE ESTILOS
// ============================================================================
const styles = StyleSheet.create({
  /* LAYOUT Y CONTENEDORES PRINCIPALES */
  container: {
    width: '100%',
    flex: 1,
    backgroundColor: COLORS.screenBg,
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
  },

  /* Secciones y contenedores */
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
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
    color: COLORS.textDark,
    marginBottom: 4,
  },

  /* Contadores de sección */
  countBadgeUpcoming: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  countBadgeTextUpcoming: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  countBadgeHistory: {
    backgroundColor: COLORS.disabledBg,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeTextHistory: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Estado vacío */
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.emptyBg,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  smallIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },

  /* Tarjetas de sesión */
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },
  historyDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  historyTimeText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textMain,
    marginTop: 2,
  },
  historyDoctorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  historyDoctorText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  upcomingCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderCard,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderCard,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  doctorText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  doctorNameBold: {
    fontWeight: '700',
    color: COLORS.textHighlight,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  historyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  /* Acento lateral por tipo de especialista */
  cardAccentTitular: {
    borderLeftWidth: 6,

  },
  cardAccentSuplente: {
    borderLeftWidth: 4.5,

  },
  cardAccentAnterior: {
    borderLeftWidth: 4.5,

  },

  /* Distintivos de especialista */
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeTextBase: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  badgeTitular: {
    borderColor: COLORS.borderGray,
  },
  badgeTitularText: {
    color: COLORS.titularText,
  },
  badgeSuplenteText: {
    color: COLORS.suplenteText,
  },
  badgeAnteriorText: {
    color: COLORS.anteriorText,
  },

  /* Fecha y modalidad */
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.titularText,
  },
  modalityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  modalityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.modalityText,
  },

  /* Estado de las citas */
  statusBadgeBase: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusBadgeTextBase: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusBadgeUpcoming: {
    backgroundColor: COLORS.statusScheduledBg,
  },
  statusBadgeTextUpcoming: {
    color: COLORS.statusScheduledText,
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.statusCompletedBg,
  },
  statusBadgeTextCompleted: {
    color: COLORS.statusCompletedText,
  },
  statusBadgeCancelled: {
    backgroundColor: COLORS.statusCancelledBg,
  },
  statusBadgeTextCancelled: {
    color: COLORS.statusCancelledText,
  },

  /* Paginación del historial */
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: COLORS.borderCard,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderColor: COLORS.borderButton,
    borderWidth: 1,
    backgroundColor: COLORS.white,
  },
  paginationButtonDisabled: {
    backgroundColor: COLORS.disabledBg,
  },
  paginationButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  paginationButtonTextDisabled: {
    color: COLORS.disabledText,
  },
  paginationInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});