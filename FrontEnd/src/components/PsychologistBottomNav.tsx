import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type PsychologistTab = 'pacientes' | 'inicio' | 'perfil';

interface PsychologistBottomNavProps {
  activeTab: PsychologistTab;
  onChangeTab: (tab: PsychologistTab) => void;
}

export const PsychologistBottomNav: React.FC<
  PsychologistBottomNavProps
> = ({
  activeTab,
  onChangeTab,
}) => {
  return (
    <View style={styles.container}>

      {/* Pacientes */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onChangeTab('pacientes')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="people-outline"
          size={23}
          color={
            activeTab === 'pacientes'
              ? '#0F613B'
              : '#9CA3AF'
          }
        />

        <Text
          style={[
            styles.label,
            activeTab === 'pacientes' && styles.activeLabel,
          ]}
        >
          Pacientes
        </Text>
      </TouchableOpacity>

      {/* Inicio */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onChangeTab('inicio')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="home-outline"
          size={23}
          color={
            activeTab === 'inicio'
              ? '#0F613B'
              : '#9CA3AF'
          }
        />

        <Text
          style={[
            styles.label,
            activeTab === 'inicio' && styles.activeLabel,
          ]}
        >
          Inicio
        </Text>
      </TouchableOpacity>

      {/* Perfil */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onChangeTab('perfil')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="person-outline"
          size={23}
          color={
            activeTab === 'perfil'
              ? '#0F613B'
              : '#9CA3AF'
          }
        />

        <Text
          style={[
            styles.label,
            activeTab === 'perfil' && styles.activeLabel,
          ]}
        >
          Perfil
        </Text>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },

  label: {
    marginTop: 4,
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  activeLabel: {
    color: '#0F613B',
    fontWeight: '700',
  },
});