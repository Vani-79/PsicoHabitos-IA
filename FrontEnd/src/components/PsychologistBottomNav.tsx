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

type TabIconName = keyof typeof Ionicons.glyphMap;

interface NavItemConfig {
  key: PsychologistTab;
  label: string;
  activeIcon: TabIconName;
  inactiveIcon: TabIconName;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    key: 'inicio',
    label: 'Inicio',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    key: 'pacientes',
    label: 'Pacientes',
    activeIcon: 'people',
    inactiveIcon: 'people-outline',
  },
  {
    key: 'calendario',
    label: 'Calendario',
    activeIcon: 'calendar',
    inactiveIcon: 'calendar-outline',
  },
  {
    key: 'perfil',
    label: 'Perfil',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
];

interface NavItemProps {
  label: string;
  activeIcon: TabIconName;
  inactiveIcon: TabIconName;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}

const PsychologistNavItem: React.FC<NavItemProps> = ({
  label,
  activeIcon,
  inactiveIcon,
  isActive,
  activeColor,
  inactiveColor,
  onPress,
}) => {
  const iconName = isActive ? activeIcon : inactiveIcon;
  const color = isActive ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      style={styles.tab}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={iconName}
        size={22}
        color={color}
      />
      <Text
        style={[
          styles.label,
          { color },
          isActive && styles.activeLabel,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

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
      {NAV_ITEMS.map((item) => (
        <PsychologistNavItem
          key={item.key}
          label={item.label}
          activeIcon={item.activeIcon}
          inactiveIcon={item.inactiveIcon}
          isActive={activeTab === item.key}
          activeColor={navigationColors.active}
          inactiveColor={navigationColors.inactive}
          onPress={() => onChangeTab(item.key)}
        />
      ))}
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