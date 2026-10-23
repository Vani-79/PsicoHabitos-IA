import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PSYCHOLOGIST_COLORS } from '../screens/Psicologo/psychologistColors';

export type PsychologistTab = 'inicio' | 'pacientes' | 'calendario' | 'perfil';

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
  const navigationColors = PSYCHOLOGIST_COLORS[activeTab].navigation;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: navigationColors.background,
          borderTopColor: navigationColors.border,
        },
      ]}
    >

      {/* Inicio */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onChangeTab('inicio')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={activeTab === 'inicio' ? 'home' : 'home-outline'}
          size={22}
          color={activeTab === 'inicio' ? navigationColors.active : navigationColors.inactive}
        />
        <Text
          style={[
            styles.label,
            { color: activeTab === 'inicio' ? navigationColors.active : navigationColors.inactive },
            activeTab === 'inicio' && styles.activeLabel,
          ]}
        >
          Inicio
        </Text>
      </TouchableOpacity>

      {/* Pacientes */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onChangeTab('pacientes')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={activeTab === 'pacientes' ? 'people' : 'people-outline'}
          size={22}
          color={activeTab === 'pacientes' ? navigationColors.active : navigationColors.inactive}
        />
        <Text
          style={[
            styles.label,
            { color: activeTab === 'pacientes' ? navigationColors.active : navigationColors.inactive },
            activeTab === 'pacientes' && styles.activeLabel,
          ]}
        >
          Pacientes
        </Text>
      </TouchableOpacity>

      {/* Calendario */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onChangeTab('calendario')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={activeTab === 'calendario' ? 'calendar' : 'calendar-outline'}
          size={22}
          color={activeTab === 'calendario' ? navigationColors.active : navigationColors.inactive}
        />
        <Text
          style={[
            styles.label,
            { color: activeTab === 'calendario' ? navigationColors.active : navigationColors.inactive },
            activeTab === 'calendario' && styles.activeLabel,
          ]}
        >
          Calendario
        </Text>
      </TouchableOpacity>

      {/* Perfil */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onChangeTab('perfil')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={activeTab === 'perfil' ? 'person' : 'person-outline'}
          size={22}
          color={activeTab === 'perfil' ? navigationColors.active : navigationColors.inactive}
        />
        <Text
          style={[
            styles.label,
            { color: activeTab === 'perfil' ? navigationColors.active : navigationColors.inactive },
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
    borderTopWidth: 1,
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
    fontWeight: '600',
  },

  activeLabel: {
    fontWeight: '700',
  },
});