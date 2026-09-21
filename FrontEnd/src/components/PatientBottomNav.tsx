import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export const PatientBottomNav: React.FC<PatientBottomNavProps> = ({
  activeTab,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();

  const habitsScale = useRef(new Animated.Value(1)).current;
  const exercisesScale = useRef(new Animated.Value(1)).current;

  const animateScale = (
    animation: Animated.Value,
    active: boolean
  ) => {
    Animated.spring(animation, {
      toValue: active ? 1.18 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  return (
    <View
      style={[
        styles.bottomNavContainer,
        {
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}
    >
      {/* Botón 1: Sesiones */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('calendar')}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={
            activeTab === 'calendar'
              ? 'calendar'
              : 'calendar-outline'
          }
          size={26}
          color="#6FAF86"
        />
      </TouchableOpacity>

      {/* Botón 2: Prácticas de bienestar */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => {
          onNavigate('exercises');
          animateScale(exercisesScale, true);
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Animated.View
          style={{
            transform: [{ scale: exercisesScale }],
          }}
        >
          <Ionicons
            name={
              activeTab === 'exercises'
                ? 'fitness'
                : 'fitness-outline'
            }
            size={27}
            color="#6FAF86"
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Botón 3: Hábitos */}
      <TouchableOpacity
  style={styles.navButton}
  onPress={() => onNavigate('habits')}
  activeOpacity={0.7}
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
>
  <Image
    source={require('../../assets/habitos-nav.png')}
    style={styles.habitsNavIcon}
    resizeMode="contain"
  />
</TouchableOpacity>

      {/* Botón 4: Chatbot H.O.P.E. */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('chatbot')}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <View style={styles.chatbotIconWrapper}>
          <Image
            source={require('../../assets/h.o.p.e.png')}
            style={styles.chatbotImage}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>

      {/* Botón 5: Perfil */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => onNavigate('profile')}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={
            activeTab === 'profile'
              ? 'person'
              : 'person-outline'
          }
          size={26}
          color="#6FAF86"
        />
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
    paddingVertical: 4,
    minHeight: 40,
  },

  chatbotIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  chatbotImage: {
    width: 30,
    height: 30,
  },

  habitsNavIcon: {
    width: 40,
    height: 40,
  },
});