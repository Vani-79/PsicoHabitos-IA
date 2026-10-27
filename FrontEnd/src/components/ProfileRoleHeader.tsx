import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const COLORS = {
  charcoal: '#1F2937',
  borderSoft: '#E5EEE8',
  background: '#F8FBF9',
} as const;

export interface ProfileRoleHeaderProps {
  title?: string;
}

/**
 * Encabezado estático y limpio para la vista de perfil (sin menú desplegable duplicado).
 * El cambio de rol se gestiona de forma única e intuitiva mediante la tarjeta de acceso en la pantalla.
 */
export const ProfileRoleHeader: React.FC<ProfileRoleHeaderProps> = ({
  title = 'Mi Perfil',
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.charcoal,
  },
});
