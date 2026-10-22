import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tipos de pestañas disponibles
export type PatientTab =
  | 'calendar'
  | 'exercises'
  | 'chatbot'
  | 'profile'
  | 'habits';

interface PatientBottomNavProps {
  activeTab?: PatientTab | null;
  onNavigate: (tab: PatientTab) => void;
}

// Configuración de hitSlop estática para evitar re-creación de objetos en cada render
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const COLORS = {
  activeIcon: '#0f613b77',
  inactiveIcon: '#727376',
  surface: '#ffffff',
  border: '#ffffff',
  shadow: '#000',

} as const;

// Estructura de datos para definir los elementos de la barra de navegación
interface NavItemConfig {
  key: PatientTab;
  iconType: 'ionicons' | 'image';
  activeIcon?: keyof typeof Ionicons.glyphMap;
  inactiveIcon?: keyof typeof Ionicons.glyphMap;
  size?: number;
  imageSource?: any;
 
}

// Ítems de navegación mostrados en la barra
const NAV_ITEMS: NavItemConfig[] = [
  {
    key: 'calendar',
    iconType: 'ionicons',
    activeIcon: 'calendar',
    inactiveIcon: 'calendar-outline',
    size: 27,
  },
  {
    key: 'exercises',
    iconType: 'ionicons',
    activeIcon: 'play-circle',
    inactiveIcon: 'play-circle-outline',
    size: 27,
  },
  {
    key: 'habits',
    iconType: 'ionicons',
    activeIcon: 'checkmark-done-circle',
    inactiveIcon: 'checkmark-done-circle-outline',
    size: 37,
  
    
  },
  {
    key: 'chatbot',
    iconType: 'ionicons',
    activeIcon: 'chatbubble-ellipses',
    inactiveIcon: 'chatbubble-ellipses-outline',
    size: 27,
  },
  {
    key: 'profile',
    iconType: 'ionicons',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
    size: 26,
  },
];

export const PatientBottomNav: React.FC<PatientBottomNavProps> = ({
  activeTab,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomNavContainer,
        { paddingBottom: Math.max(insets.bottom, 14) },
      ]}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.key;

        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navButton}
            onPress={() => onNavigate(item.key)}
            activeOpacity={0.7}
            hitSlop={HIT_SLOP}
          >
            {item.iconType === 'ionicons' ? (
              <Ionicons
                name={(isActive ? item.activeIcon : item.inactiveIcon)!}
                size={item.size || 26}
                color={isActive ? COLORS.activeIcon : COLORS.inactiveIcon}
              />
            ) : (
              <Image
                source={item.imageSource}
                style={{ width: item.size || 35, height: item.size || 35 }}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // Contenedor y disposición
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 8,

    // Mantiene la barra interactiva por encima del contenido de la pantalla.
    zIndex: 999,
    elevation: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  // Área táctil de cada pestaña
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 44,
  },
});