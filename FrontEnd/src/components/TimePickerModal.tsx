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

export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '14:00', '14:30', '15:00', '15:30', '16:00',
  '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
];

interface TimePickerModalProps {
  visible: boolean;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  onClose: () => void;
  title?: string;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  selectedTime,
  onSelectTime,
  onClose,
  title = 'Seleccionar hora',
}) => {
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
            {TIME_SLOTS.map((slot) => {
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
});
