import React from 'react';
import { StyleSheet, Text, View, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientBottomNav, PatientTab } from '../../components/PatientBottomNav';

interface PatientChatbotScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
}

export const PatientChatbotScreen: React.FC<PatientChatbotScreenProps> = ({
  onNavigateTab,
  userName = 'Paciente',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
      >
        <View style={styles.chatCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('../../../assets/h.o.p.e.png')}
              style={styles.avatarImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.botGreeting}>¡Hola, {userName}!</Text>
          <Text style={styles.botDescription}>
            Soy H.o.p.e, tu asistente virtual de apoyo y acompañamiento para tu bienestar psicológico y hábitos diarios.
          </Text>

          <View style={styles.chatBubble}>
            <Text style={styles.bubbleText}>
              Próximamente podrás conversar conmigo aquí para recibir reflexiones guiadas, recordatorios y orientación personalizada.
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>En fase de preparación</Text>
          </View>
        </View>
      </ScrollView>

      {/* Barra de navegación inferior */}
      <PatientBottomNav activeTab="chatbot" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAF5EE' },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40, // <-- Brolla la tarjeta bajándola un poco desde la parte superior
    alignItems: 'center',
  },
  chatCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: "100%",  // Nuevo ancho fijo
    height: 600, // Nuevo alto fijo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#C8E6C9',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
  },
  botGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F613B',
    marginBottom: 8,
    textAlign: 'center',
  },
  botDescription: {
    fontSize: 14.5,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  chatBubble: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#0F613B',
  },
  bubbleText: {
    fontSize: 13.5,
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4EDE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: '#0F613B',
    fontWeight: '600',
  },
});
