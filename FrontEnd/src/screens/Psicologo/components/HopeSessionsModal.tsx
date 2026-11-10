import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { hopeService, HopeSession, HopeMessage } from '../../../services/hopeService';
import { PSYCHOLOGIST_COLORS } from '../psychologistColors';

const COLORS = PSYCHOLOGIST_COLORS.pacientes;

interface HopeSessionsModalProps {
  visible: boolean;
  patientId?: number;
  patientName: string;
  onClose: () => void;
}

/**
 * Formatea una fecha ISO a fecha legible en español (ej: "Lunes, 02 de Noviembre, 2026").
 */
function formatSessionDate(dateStr?: string): string {
  if (!dateStr) return 'Fecha no especificada';
  try {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString('es-CL', { weekday: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const formattedDate = d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    return `${capitalizedDay}, ${formattedDate}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Formatea una fecha ISO a hora local (ej: "13:02 hrs").
 */
function formatSessionTime(dateStr?: string): string {
  if (!dateStr) return '--:--';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs`;
  } catch {
    return '--:--';
  }
}

/**
 * Calcula la duración en minutos entre dos marcas de tiempo.
 */
function calculateDurationMinutes(startStr?: string, endStr?: string): string {
  if (!startStr || !endStr) return '';
  try {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const diffMins = Math.round((end - start) / (1000 * 60));
    return diffMins > 0 ? `${diffMins} min` : '< 1 min';
  } catch {
    return '';
  }
}

export const HopeSessionsModal: React.FC<HopeSessionsModalProps> = ({
  visible,
  patientId,
  patientName,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<HopeSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);

  // Margen de seguridad inferior para garantizar que el botón quede sobre la barra de navegación de Android
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16);

  useEffect(() => {
    if (visible && patientId) {
      void fetchHistory();
    }
  }, [visible, patientId]);

  const fetchHistory = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await hopeService.getPatientHistoryForPsychologist(patientId);
      if (res.success && res.history) {
        setSessions(res.history);
      }
    } catch (error) {
      console.error('❌ [HopeSessionsModal Error]:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandSession = (sessionId: number) => {
    setExpandedSessionId((prev) => (prev === sessionId ? null : sessionId));
  };

  const getSessionStatusInfo = (session: HopeSession) => {
    const isFinalized = Boolean(session.finalizada_en);
    const isTimeout =
      session.titulo_resumen?.includes('inactividad') ||
      session.titulo_resumen?.includes('Inactividad');

    if (!isFinalized) {
      return {
        pillStyle: styles.statusPillActive,
        textStyle: styles.statusTextActive,
        label: 'En curso',
      };
    }

    if (isTimeout) {
      return {
        pillStyle: styles.statusPillTimeout,
        textStyle: styles.statusTextTimeout,
        label: 'Cierre por inactividad',
      };
    }

    return {
      pillStyle: styles.statusPillFinalized,
      textStyle: styles.statusTextFinalized,
      label: 'Finalizada por paciente',
    };
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.iconosPerfil} />
          <Text style={styles.loadingText}>Cargando conversaciones de H.o.p.e...</Text>
        </View>
      );
    }

    if (sessions.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textoSecundario} />
          <Text style={styles.emptyTitle}>Sin conversaciones registradas</Text>
          <Text style={styles.emptyDesc}>
            Cuando el paciente interactúe con H.o.p.e, las sesiones cerradas con su fecha, hora
            y transcripción completa se guardarán aquí.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollListContainer}
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      >
        {sessions.map((session) => {
          const isExpanded = expandedSessionId === session.id;
          const duration = calculateDurationMinutes(session.iniciada_en, session.finalizada_en);
          const statusInfo = getSessionStatusInfo(session);

          return (
            <View key={session.id} style={styles.sessionCard}>
              {/* Encabezado de la tarjeta de sesión */}
              <View style={styles.sessionCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionDateText}>
                    {formatSessionDate(session.iniciada_en)}
                  </Text>
                  <Text style={styles.sessionTimeText}>
                    Horario: {formatSessionTime(session.iniciada_en)} -{' '}
                    {formatSessionTime(session.finalizada_en)}
                    {duration ? ` (${duration})` : ''}
                  </Text>
                </View>

                <View style={[styles.statusPill, statusInfo.pillStyle]}>
                  <Text style={[styles.statusPillText, statusInfo.textStyle]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>

              {/* Resumen clínico del psicólogo si existe */}
              {session.resumen_clinico_psicologo ? (
                <View style={styles.clinicalReportBox}>
                  <View style={styles.clinicalReportTitleRow}>
                    <Ionicons name="clipboard-outline" size={16} color={COLORS.iconosPerfil} />
                    <Text style={styles.clinicalReportTitle}>Evaluación Psicométrica</Text>
                  </View>
                  <Text style={styles.clinicalReportText}>
                    {session.resumen_clinico_psicologo}
                  </Text>
                </View>
              ) : null}

              {/* Botón para desplegar transcripción completa */}
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => toggleExpandSession(session.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={COLORS.iconosPerfil}
                />
                <Text style={styles.expandButtonText}>
                  {isExpanded
                    ? 'Ocultar conversación'
                    : `Ver transcripción completa (${session.mensajes?.length || 0} mensajes)`}
                </Text>
              </TouchableOpacity>

              {/* Transcripción expandible de mensajes */}
              {isExpanded && (
                <View style={styles.messagesContainer}>
                  {session.mensajes && session.mensajes.length > 0 ? (
                    session.mensajes.map((msg: HopeMessage, idx: number) => {
                      const isPatient = msg.remitente === 'paciente';
                      const messageKey = msg.id
                        ? `msg-${msg.id}`
                        : `msg-${session.id}-${msg.enviado_en || ''}-${idx}`;
                      return (
                        <View
                          key={messageKey}
                          style={[
                            styles.msgRow,
                            isPatient ? styles.patientMsgRow : styles.hopeMsgRow,
                          ]}
                        >
                          <View
                            style={[
                              styles.msgBubble,
                              isPatient ? styles.patientBubble : styles.hopeBubble,
                            ]}
                          >
                            <View style={styles.msgHeader}>
                              <Text
                                style={[
                                  styles.senderLabel,
                                  isPatient ? styles.patientSenderText : styles.hopeSenderText,
                                ]}
                              >
                                {isPatient ? patientName : 'H.o.p.e (IA)'}
                              </Text>
                              {Boolean(msg.enviado_en) && (
                                <Text style={styles.msgTime}>
                                  {formatSessionTime(msg.enviado_en!)}
                                </Text>
                              )}
                            </View>
                            <Text
                              style={[
                                styles.msgText,
                                isPatient ? styles.patientText : styles.hopeText,
                              ]}
                            >
                              {msg.mensaje}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noMessagesText}>No hay mensajes en esta sesión.</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Cabecera del modal */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarBadge}>
                <Image
                  source={require('../../../../assets/h.o.p.e.png')}
                  style={styles.avatarImg}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={styles.modalTitle}>Historial H.o.p.e (IA)</Text>
                <Text style={styles.modalSubtitle}>Paciente: {patientName}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={COLORS.textoPrincipal} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.iconosPerfil} />
            <Text style={styles.infoBannerText}>
              Registro de conversaciones finalizadas y cierres automáticos por inactividad (30 min).
            </Text>
          </View>

          {/* Contenido principal scrolleable con flex: 1 */}
          <View style={styles.bodyContainer}>
            {renderContent()}
          </View>

          {/* Botón Inferior de Cerrar: FIJO y elevado sobre los botones nativos de Android */}
          <View style={[styles.footerContainer, { paddingBottom: bottomInset + 8 }]}>
            <TouchableOpacity style={styles.footerCloseBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.footerCloseText}>Cerrar Historial</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '88%',
    maxHeight: '92%',
    overflow: 'hidden',
  },
  bodyContainer: {
    flex: 1,
  },
  scrollListContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  avatarImg: {
    width: 28,
    height: 28,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textoPrincipal,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: COLORS.textoSecundario,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    minHeight: 250,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: COLORS.textoSecundario,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textoPrincipal,
    marginTop: 14,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textoSecundario,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  scrollList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sessionDateText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textoPrincipal,
  },
  sessionTimeText: {
    fontSize: 12,
    color: COLORS.textoSecundario,
    marginTop: 3,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillFinalized: {
    backgroundColor: '#DCFCE7',
  },
  statusPillTimeout: {
    backgroundColor: '#FEF3C7',
  },
  statusPillActive: {
    backgroundColor: '#E0E7FF',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextFinalized: {
    color: '#166534',
  },
  statusTextTimeout: {
    color: '#92400E',
  },
  statusTextActive: {
    color: '#3730A3',
  },
  clinicalReportBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clinicalReportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  clinicalReportTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.iconosPerfil,
  },
  clinicalReportText: {
    fontSize: 12,
    color: COLORS.textoPrincipal,
    lineHeight: 17,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expandButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.iconosPerfil,
  },
  messagesContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  msgRow: {
    marginBottom: 10,
    maxWidth: '90%',
  },
  patientMsgRow: {
    alignSelf: 'flex-end',
  },
  hopeMsgRow: {
    alignSelf: 'flex-start',
  },
  msgBubble: {
    borderRadius: 12,
    padding: 10,
  },
  patientBubble: {
    backgroundColor: COLORS.iconosPerfil,
  },
  hopeBubble: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  senderLabel: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  patientSenderText: {
    color: '#D1FAE5',
  },
  hopeSenderText: {
    color: '#4B5563',
  },
  msgTime: {
    fontSize: 9.5,
    color: '#9CA3AF',
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  patientText: {
    color: '#FFFFFF',
  },
  hopeText: {
    color: '#1F2937',
  },
  noMessagesText: {
    fontSize: 12,
    color: COLORS.textoSecundario,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  footerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerCloseBtn: {
    backgroundColor: COLORS.iconosPerfil,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerCloseText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

