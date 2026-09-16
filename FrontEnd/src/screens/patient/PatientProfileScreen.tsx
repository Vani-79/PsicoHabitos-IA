import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PatientBottomNav, PatientTab } from '../../components/PatientBottomNav';
import { patientService } from '../../services/patientService';
import { PatientProfileData } from '../../types/patient';

interface PatientProfileScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

const formatBirthDate = (dateStr?: string): string => {
  if (!dateStr) return 'No registrada';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return cleanDate;
};

const formatAge = (edad?: number | string): string => {
  if (edad === undefined || edad === null || edad === '') return 'No registrada';
  return `${edad} años`;
};

export const PatientProfileScreen: React.FC<PatientProfileScreenProps> = ({
  onNavigateTab,
  userName = 'Paciente',
  userEmail,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await patientService.getPatientProfile(userEmail, userName);
        if (isMounted) {
          setProfile(data);
        }
      } catch (err) {
        console.warn('Error al cargar perfil del paciente desde MySQL:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [userEmail, userName]);

  const fullName = profile
    ? [profile.nombre, profile.apellido_paterno, profile.apellido_materno]
        .filter(Boolean)
        .join(' ')
        .trim() || userName
    : userName;

  const handleLogoutPress = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => {
            onLogout?.();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderProfileContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#0F613B" />
          <Text style={styles.loadingText}>Cargando datos desde la base de datos...</Text>
        </View>
      );
    }

    if (profile) {
      return (
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={42} color="#0F613B" />
          </View>
          <Text style={styles.profileName}>{fullName}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>PACIENTE REGISTRADO</Text>
          </View>

          <View style={styles.infoSection}>
            {/* Campo: Nombre */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="person-outline" size={18} color="#0F613B" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{fullName}</Text>
              </View>
            </View>

            {/* Campo: Edad */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="hourglass-outline" size={18} color="#0F613B" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Edad</Text>
                <Text style={styles.infoValue}>{formatAge(profile.edad)}</Text>
              </View>
            </View>

            {/* Campo: Fecha de Nacimiento */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="calendar-outline" size={18} color="#0F613B" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Fecha de Nacimiento</Text>
                <Text style={styles.infoValue}>{formatBirthDate(profile.fecha_nacimiento)}</Text>
              </View>
            </View>

            {/* Campo: Correo */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="mail-outline" size={18} color="#0F613B" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Correo</Text>
                <Text style={styles.infoValue}>{profile.email || userEmail || 'No registrado'}</Text>
              </View>
            </View>

            {/* Campo: Especialista */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="medkit-outline" size={18} color="#0F613B" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Especialista</Text>
                <Text style={styles.infoValue}>{profile.especialista || 'Sin especialista asignado'}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person-outline" size={42} color="#0F613B" />
        </View>
        <Text style={styles.profileName}>{userName}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>INFORMACIÓN NO ENCONTRADA</Text>
        </View>
        <Text style={styles.emptyNote}>
          No se encontraron registros en MySQL para este usuario.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
      >
        {renderProfileContent()}

        {/* Botón Cerrar Sesión */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogoutPress}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Barra de navegación inferior */}
      <PatientBottomNav activeTab="profile" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EAF5EE' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EEE8',
    backgroundColor: '#F8FBF9',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  profileCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyNote: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#E4EDE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#A5C1B3',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  roleTag: {
    backgroundColor: '#E4EDE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F613B',
    letterSpacing: 0.5,
  },
  infoSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  logoutButton: {
    width: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
