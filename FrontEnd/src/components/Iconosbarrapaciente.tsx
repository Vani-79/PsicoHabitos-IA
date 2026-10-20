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

// Estructura de datos para definir los elementos de la barra de navegación
interface NavItemConfig {
  key: PatientTab;
  iconType: 'ionicons' | 'image';
  activeIcon?: keyof typeof Ionicons.glyphMap;
  inactiveIcon?: keyof typeof Ionicons.glyphMap;
  size?: number;
  imageSource?: any;
}

// Lista de ítems para renderizar dinámicamente
const NAV_ITEMS: NavItemConfig[] = [
  //Icono de sesiones
  {
    key: 'calendar',
    iconType: 'ionicons',
    activeIcon: 'calendar',
    inactiveIcon: 'calendar-outline',
    size: 26,
  },

  //Icono de ejercicios
  {
    key: 'exercises',
    iconType: 'ionicons',
    activeIcon: 'fitness',
    inactiveIcon: 'fitness-outline',
    size: 27,
  },

  //Icono de registro de hábitos
  {
    key: 'habits',
    iconType: 'image',
    imageSource: require('../../assets/habitos-nav.png'),
  },

  //Icono de chat IA
  {
    key: 'chatbot',
    iconType: 'image',
    imageSource: require('../../assets/bot-de-voz.png'),
    size: 28,
  },

  //Icono de perfil paciente
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
                size={item.size}
                color="#10331dad"
              />
            ) : (
              <Image
                source={item.imageSource}
                style={{ width: item.size || 40, height: item.size || 40 }}
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
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8FBF9',
    borderTopWidth: 1,
    borderColor: '#E5EEE8',
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    minHeight: 40,
  },
});