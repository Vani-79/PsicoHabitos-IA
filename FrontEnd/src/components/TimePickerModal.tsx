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

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    const hStr = String(hour).padStart(2, '0');
    if (hour < 20) {
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
  selectedDate?: string; // si es hoy, se filtran las horas ya pasadas
  busySessions?: { hora: string; duracion: number }[];
  duration?: number; // Duración de la sesión solicitada en minutos (por defecto 60)
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

    if (isToday && slotMinutes <= nowMinutes + 30) return false;
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
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {availableSlots.length === 0 && (
              <Text style={styles.noSlotsText}>
                {isToday
                  ? 'No quedan horarios disponibles para hoy. Elige otra fecha.'
                  : 'No hay horarios disponibles para esta fecha. Elige otra fecha.'}
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
                  {isSelected && <Ionicons name="checkmark-circle" size={18} color="#0F613B" />}
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: 460,
    shadowColor: '#000',
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
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#F9FAFB',
  },
  timeOptionActive: {
    backgroundColor: '#EAF5EE',
    borderWidth: 1,
    borderColor: '#0F613B',
  },
  timeOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  timeOptionTextActive: {
    color: '#0F613B',
    fontWeight: '700',
  },

  noSlotsText: {
    fontSize: 13.5,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
