import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  overlay: 'rgba(0, 0, 0, 0.45)',
  white: '#FFFFFF',
  black: '#000',
  gray500: '#6B7280',
  green: '#0F613B',
  gray100: '#F3F4F6',
  charcoal: '#111827',
  gray50: '#F9FAFB',
  greenSoft: '#EAF5EE',
  gray700: '#374151',
  gray400: '#9CA3AF',
} as const;

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 21; hour++) {
    const hStr = String(hour).padStart(2, '0');
    if (hour < 21) {
      slots.push(`${hStr}:00`, `${hStr}:15`, `${hStr}:30`, `${hStr}:45`);
    } else {
      slots.push(`${hStr}:00`);
    }
  }
  return slots;
};

export const TIME_SLOTS = generateTimeSlots();

interface TimePickerModalProps {
  visible: boolean;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  onClose: () => void;
  title?: string;
  selectedDate?: string; // si es hoy y allowPastTimes=false, se filtran las horas ya pasadas
  busySessions?: { hora: string; duracion: number }[];
  duration?: number; // Duración de la sesión solicitada en minutos (por defecto 60)
  allowPastTimes?: boolean; // Permite horas pasadas de hoy (ej: registro retrospectivo de primera sesión)
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  selectedTime,
  onSelectTime,
  onClose,
  title = 'Seleccionar hora',
  selectedDate,
  busySessions = [],
  duration = 60,
  allowPastTimes = false,
}) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = selectedDate === todayStr;
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  // Comprueba si el intervalo candidato [slotMinutes, slotMinutes + sessionDuration)
  // colisiona con alguna sesión ocupada [busyStart, busyEnd)
  const isSlotColliding = (slotMinutes: number, sessionDuration: number) => {
    const slotEnd = slotMinutes + sessionDuration;
    return busySessions.some((b) => {
      if (!b.hora?.includes(':')) return false;
      const [bh, bm] = b.hora.split(':').map(Number);
      const busyStart = bh * 60 + bm;
      const busyEnd = busyStart + (Number(b.duracion) || 60);
      // Solapamiento exacto de rangos: A_inicio < B_fin && B_inicio < A_fin
      return slotMinutes < busyEnd && busyStart < slotEnd;
    });
  };

  const availableSlots = TIME_SLOTS.filter((slot) => {
    const [h, m] = slot.split(':').map(Number);
    const slotMinutes = h * 60 + m;

    if (isToday && !allowPastTimes && slotMinutes <= nowMinutes + 30) return false;
    if (isSlotColliding(slotMinutes, duration)) return false;
    // Solo evitar que una sesión cruce al día siguiente (después de las 23:59)
    if (slotMinutes + duration > 24 * 60) return false;

    return true;
  });

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={COLORS.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {availableSlots.length === 0 && (
              <Text style={styles.noSlotsText}>
                {isToday && !allowPastTimes
                  ? 'No quedan horarios disponibles para hoy. Elige otra fecha.'
                  : 'No hay horarios disponibles sin conflicto para esta fecha. Elige otra fecha u otra duración.'}
              </Text>
            )}
            {availableSlots.map((slot) => {
              const isSelected = selectedTime === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeOption, isSelected && styles.timeOptionActive]}
                  onPress={() => {
                    onSelectTime(slot);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextActive]}>
                    {slot} hrs
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color={COLORS.green} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: 460,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
  scrollList: {
    maxHeight: 340,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: COLORS.gray50,
  },
  timeOptionActive: {
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  timeOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray700,
  },
  timeOptionTextActive: {
    color: COLORS.green,
    fontWeight: '700',
  },

  noSlotsText: {
    fontSize: 13.5,
    color: COLORS.gray400,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
