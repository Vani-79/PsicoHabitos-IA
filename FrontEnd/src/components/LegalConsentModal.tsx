import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  green: '#0F613B',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.45)',
  black: '#000',
  greenSoft: '#E8F5E9',
  greenMuted: '#E4EDE7',
  background: '#F7FAF8',
  border: '#E2EBE5',
  gray700: '#374151',
  greenSubtle: '#EBF5F0',
  gray500: '#6B7280',
} as const;

interface LegalConsentModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const LegalConsentModal: React.FC<LegalConsentModalProps> = ({
  visible,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalIconCircle}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.green} />
          </View>

          <Text style={styles.modalTitle}>Protección de Datos y Privacidad</Text>

          <View style={styles.modalLawBadge}>
            <Ionicons name="document-text-outline" size={13} color={COLORS.green} />
            <Text style={styles.modalLawBadgeText}>Ley N° 21.719</Text>
          </View>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.modalContentBox}>
              <Text style={styles.modalParagraph}>
                Esta aplicación se rige estrictamente bajo la{' '}
                <Text style={styles.modalBoldText}>
                  Ley de Protección de Datos Personales N° 21.719
                </Text>{' '}
                y normativas aplicables sobre secreto profesional en salud mental.
              </Text>

              <Text style={styles.modalParagraph}>
                Toda la información registrada sobre tu bienestar, hábitos diarios, emociones y reflexiones es de carácter{' '}
                <Text style={styles.modalBoldText}>estrictamente confidencial y sensible</Text>.
              </Text>

              <Text style={styles.modalParagraph}>
                Tus datos serán{' '}
                <Text style={styles.modalBoldText}>
                  única y exclusivamente manejados y utilizados por tu profesional tratante
                </Text>{' '}
                con el fin de acompañar y orientar tu proceso terapéutico.
              </Text>

              <View style={styles.legalNoticeBox}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.green} style={{ marginRight: 6 }} />
                <Text style={styles.legalNoticeText}>
                  Conforme a la Ley N° 21.719, al aceptar se registra de manera segura la fecha, hora y dirección IP desde donde se otorga este consentimiento con fines probatorios de auditoría y seguridad.
                </Text>
              </View>
            </View>
          </ScrollView>

          {showAcceptButton && onAccept && (
            <TouchableOpacity
              style={styles.modalAcceptButton}
              onPress={() => {
                onAccept();
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.modalAcceptButtonText}>Acepto los términos y condiciones</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={showAcceptButton ? styles.modalCloseButton : styles.modalPrimaryCloseButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={showAcceptButton ? styles.modalCloseButtonText : styles.modalPrimaryCloseButtonText}>
              {showAcceptButton ? 'Cerrar sin aceptar' : 'Entendido'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.greenSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.green,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalLawBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenMuted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    marginBottom: 14,
  },
  modalLawBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
  },
  scrollContainer: {
    width: '100%',
    marginBottom: 16,
  },
  modalContentBox: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalParagraph: {
    fontSize: 12.5,
    color: COLORS.gray700,
    lineHeight: 18,
    marginBottom: 8,
  },
  modalBoldText: {
    fontWeight: '700',
    color: COLORS.green,
  },
  legalNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.greenSubtle,
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  legalNoticeText: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.green,
    lineHeight: 16,
  },
  modalAcceptButton: {
    backgroundColor: COLORS.green,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalAcceptButtonText: {
    color: COLORS.white,
    fontSize: 14.5,
    fontWeight: '700',
  },
  modalCloseButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  modalCloseButtonText: {
    color: COLORS.gray500,
    fontSize: 13,
    fontWeight: '600',
  },
  modalPrimaryCloseButton: {
    backgroundColor: COLORS.green,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalPrimaryCloseButtonText: {
    color: COLORS.white,
    fontSize: 14.5,
    fontWeight: '700',
  },
});
