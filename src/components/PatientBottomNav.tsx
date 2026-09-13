import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type PatientTab = 'calendar' | 'exercises' | 'chatbot' | 'profile' | 'habits';

interface PatientBottomNavProps {
  activeTab?: PatientTab | null;
  onNavigate: (tab: PatientTab) => void;
}

export const PatientBottomNav: React.FC<PatientBottomNavProps> = ({
  activeTab,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomNavContainer,
        {
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}
    >
      {/* Botón 1: Calendario (Historial de sesiones antiguas y próximas) */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('calendar')}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={activeTab === 'calendar' ? 'calendar' : 'calendar-outline'}
          size={26}
          color={activeTab === 'calendar' ? '#0F613B' : '#737373'}
        />
        {activeTab === 'calendar' && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Botón 2: Clip (Ejercicios o respiraciones) */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('exercises')}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={activeTab === 'exercises' ? 'attach' : 'attach-outline'}
          size={28}
          color={activeTab === 'exercises' ? '#0F613B' : '#737373'}
          style={styles.clipIcon}
        />
        {activeTab === 'exercises' && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Botón 3 (Centro): Hábitos */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('habits')}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Image
          source={require('../../assets/habitos-nav.png')}
          style={[
            styles.habitsNavIcon,
            { tintColor: activeTab === 'habits' ? '#0F613B' : '#737373' },
          ]}
          resizeMode="contain"
        />
        {activeTab === 'habits' && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Botón 4: Chatbot (H.O.P.E.) */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('chatbot')}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <View
          style={[
            styles.chatbotIconWrapper,
            activeTab === 'chatbot' && styles.chatbotIconWrapperActive,
          ]}
        >
          <Image
            source={require('../../assets/h.o.p.e.png')}
            style={styles.chatbotImage}
            resizeMode="contain"
          />
        </View>
        {activeTab === 'chatbot' && <View style={styles.activeDot} />}
      </TouchableOpacity>

      {/* Botón 5: Perfil con su información */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('profile')}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={activeTab === 'profile' ? 'person' : 'person-outline'}
          size={26}
          color={activeTab === 'profile' ? '#0F613B' : '#737373'}
        />
        {activeTab === 'profile' && <View style={styles.activeDot} />}
      </TouchableOpacity>
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
    backgroundColor: '#EBEBEB',
    borderTopWidth: 1,
    borderColor: '#D3D3D3',
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 40,
  },
  clipIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  chatbotIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatbotIconWrapperActive: {
    borderWidth: 2,
    borderColor: '#0F613B',
    borderRadius: 16,
  },
  chatbotImage: {
    width: 30,
    height: 30,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0F613B',
    marginTop: 3,
  },
  habitsNavIcon: {
    width: 28,
    height: 28,
  },
});
