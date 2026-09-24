import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '../constants/auth';

interface ProfileRoleHeaderProps {
  title?: string;
  currentRole: UserRole;
  canSwitch: boolean;
  onSwitchRole: (role: UserRole) => void;
}

export const ProfileRoleHeader: React.FC<ProfileRoleHeaderProps> = ({
  title = 'Mi Perfil',
  currentRole,
  canSwitch,
  onSwitchRole,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectRole = (targetRole: UserRole) => {
    setIsOpen(false);
    if (targetRole === currentRole) return;

    const targetLabel = targetRole === 'psicologo' ? 'Psicólogo' : 'Paciente';
    Alert.alert(
      'Cambiar de Perfil',
      `¿Deseas cambiar al perfil de ${targetLabel}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: () => onSwitchRole(targetRole),
        },
      ]
    );
  };

  return (
    <View style={styles.header}>
      {/* Título Superior con pequeña flechita */}
      <TouchableOpacity
        style={styles.titleContainer}
        activeOpacity={canSwitch ? 0.7 : 1}
        onPress={() => canSwitch && setIsOpen(!isOpen)}
      >
        <Text style={styles.headerTitle}>{title}</Text>
        {canSwitch && (
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#1F2937"
            style={styles.chevronIcon}
          />
        )}
      </TouchableOpacity>

      {/* Menú desplegable con pequeña flechita */}
      {isOpen && (
        <>
          {/* Fondo para cerrar al tocar fuera */}
          <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.popoverContainer}>
            {/* Pequeña flechita que sale desde el título */}
            <View style={styles.popoverArrow} />

            <View style={styles.popoverCard}>
              {/* Opción: Psicólogo */}
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  currentRole === 'psicologo'
                    ? styles.roleActiveGreen
                    : styles.roleInactiveWhite,
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelectRole('psicologo')}
              >
                <View style={styles.roleOptionLeft}>
                  <Ionicons
                    name="medical"
                    size={17}
                    color={currentRole === 'psicologo' ? '#FFFFFF' : '#0F613B'}
                    style={styles.roleIcon}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      currentRole === 'psicologo'
                        ? styles.roleTextActive
                        : styles.roleTextInactive,
                    ]}
                  >
                    Psicólogo
                  </Text>
                </View>
                {currentRole === 'psicologo' && (
                  <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              {/* Opción: Paciente */}
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  currentRole === 'paciente'
                    ? styles.roleActiveGreen
                    : styles.roleInactiveWhite,
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelectRole('paciente')}
              >
                <View style={styles.roleOptionLeft}>
                  <Ionicons
                    name="person"
                    size={17}
                    color={currentRole === 'paciente' ? '#FFFFFF' : '#0F613B'}
                    style={styles.roleIcon}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      currentRole === 'paciente'
                        ? styles.roleTextActive
                        : styles.roleTextInactive,
                    ]}
                  >
                    Paciente
                  </Text>
                </View>
                {currentRole === 'paciente' && (
                  <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EEE8',
    backgroundColor: '#F8FBF9',
    zIndex: 999,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  chevronIcon: {
    marginLeft: 6,
  },
  backdrop: {
    position: 'absolute',
    top: 50,
    left: -1000,
    right: -1000,
    bottom: -2000,
    height: 4000,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
  },
  popoverContainer: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  popoverArrow: {
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    marginBottom: -6,
    zIndex: 1002,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#E5E7EB',
  },
  popoverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    width: 190,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  roleActiveGreen: {
    backgroundColor: '#0F613B',
  },
  roleInactiveWhite: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    marginRight: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  roleTextInactive: {
    color: '#374151',
  },
});
