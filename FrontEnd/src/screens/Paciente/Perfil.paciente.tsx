import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PatientBottomNav, PatientTab } from '../../components/PatientBottomNav';
import { ProfileRoleHeader } from '../../components/ProfileRoleHeader';
import { patientService } from '../../services/patientService';
import { PatientProfileData } from '../../types/patient';
import { useAuth } from '../../context/AuthContext';
import { formatToChileanDate } from '../../utils/date';

interface PatientProfileScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

const formatBirthDate = (dateStr?: string): string => {
  if (!dateStr) return 'No registrada';
  return formatToChileanDate(dateStr) || 'No registrada';
};

const formatAge = (edad?: number | string, birthDateStr?: string): string => {
  if (birthDateStr) {
    const raw = birthDateStr.split('T')[0];
    const parts = raw.split('-');
    if (parts.length === 3) {
      const year = Number.parseInt(parts[0], 10);
      const month = Number.parseInt(parts[1], 10) - 1;
      const day = Number.parseInt(parts[2], 10);
      const birthDate = new Date(year, month, day);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (!Number.isNaN(calculatedAge) && calculatedAge >= 0) {
        return `${calculatedAge} años`;
      }
    }
  }
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
  const { user, switchRole } = useAuth();
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);

  const canSwitchToPsychologist =
    Boolean(user?.hasMultipleRoles) ||
    Boolean(profile?.hasMultipleRoles) ||
    Boolean(user?.availableRoles?.includes('psicologo')) ||
    Boolean(profile?.availableRoles?.includes('psicologo'));

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await patientService.getPatientProfile(userEmail, userName);
      setProfile(data);
    } catch (err) {
      console.warn('Error al cargar perfil del paciente desde MySQL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [userEmail, userName]);

  const handleRevokeSuplencia = () => {
    if (!profile?.id) return;
    const suplenteName = profile.suplente?.nombre || 'el psicólogo suplente';
    Alert.alert(
      '¿Revocar suplencia?',
      `Se revocará inmediatamente el acceso temporal de ${suplenteName} a tu ficha e historial clínico.\n\nCualquier cita futura pendiente con el suplente será cancelada automáticamente para que puedas reagendar con tu psicólogo titular (${profile.especialista || 'titular'}).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, revocar acceso',
          style: 'destructive',
          onPress: async () => {
            setIsRevoking(true);
            const res = await patientService.endSubstitution(profile.id!);
            setIsRevoking(false);
            if (res.success) {
              Alert.alert(
                'Suplencia revocada',
                res.message || 'Se ha revocado el acceso temporal al psicólogo suplente y se cancelaron las citas pendientes.'
              );
              void loadProfile();
            } else {
              Alert.alert('Error', res.error || 'No se pudo revocar la suplencia.');
            }
          },
        },
      ]
    );
  };

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
          <ActivityIndicator size="large" color="#aed7c4" />
          <Text style={styles.loadingText}>Cargando datos desde la base de datos...</Text>
        </View>
      );
    }

    if (profile) {
      return (
        <View style={styles.profileCard}>

          {/* CONTENEDOR HORIZONTAL CORRECTO */}
          <View style={styles.headerProfileRow}>
            {/* Ícono a la izquierda */}
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={26} color="#5b6b64c7" />
            </View>

            {/* Nombre y Rol a la derecha */}
            <View style={styles.headerTextWrapper}>
              <Text style={styles.profileName}>{fullName}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>PACIENTE REGISTRADO</Text>
              </View>
            </View>
          </View>
      

          {/* A partir de aquí sigue la lista de información (infoSection) */}
          <View style={styles.infoSection}>
            {/* Campo: Nombre */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="person-outline" size={18} color="#575c68" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{fullName}</Text>
              </View>
            </View>

            {/* Campo: Edad */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="hourglass-outline" size={18} color="#575c68" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Edad</Text>
                <Text style={styles.infoValue}>{formatAge(profile.edad, profile.fecha_nacimiento)}</Text>
              </View>
            </View>

            {/* Campo: Fecha de Nacimiento */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="calendar-outline" size={18} color="#575c68" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Fecha de Nacimiento</Text>
                <Text style={styles.infoValue}>{formatBirthDate(profile.fecha_nacimiento)}</Text>
              </View>
            </View>

            {/* Campo: Correo */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="mail-outline" size={18} color="#575c68" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Correo</Text>
                <Text style={styles.infoValue}>{profile.email || userEmail || 'No registrado'}</Text>
              </View>
            </View>

            {/* Campo: Especialista */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="medkit-outline" size={18} color="#575c68" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Especialista Titular</Text>
                <Text style={styles.infoValue}>{profile.especialista || 'Sin especialista asignado'}</Text>
              </View>
            </View>

            {/* Suplencia Activa (si aplica) */}
            {profile.suplente && (
              <View style={styles.suplenteBox}>
                <View style={styles.suplenteBoxHeader}>
                  <Ionicons name="shield-checkmark" size={18} color="#1D4ED8" />
                  <Text style={styles.suplenteBoxTitle}>Atención en Suplencia Activa</Text>
                </View>
                <Text style={styles.suplenteBoxDesc}>
                  Has autorizado temporalmente a{' '}
                  <Text style={{ fontWeight: '700' }}>{profile.suplente.nombre}</Text> para atenderte hasta el{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {profile.suplente.fecha_fin_suplencia ? formatToChileanDate(profile.suplente.fecha_fin_suplencia) : 'fecha límite'}
                  </Text>.
                </Text>
                <TouchableOpacity
                  style={styles.revokeSuplenteBtn}
                  onPress={handleRevokeSuplencia}
                  disabled={isRevoking}
                  activeOpacity={0.8}
                >
                  {isRevoking ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.revokeSuplenteBtnText}>Revocar acceso de suplencia</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
          

          {/* Botón Cerrar Sesión */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogoutPress}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person-outline" size={42} color="#092116" />
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
      {/* Encabezado con selector desplegable desde 'Mi Perfil' */}
      
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
      >
        {renderProfileContent()}

      </ScrollView>

      {/* Barra de navegación inferior */}
      <PatientBottomNav activeTab="profile" onNavigate={onNavigateTab} />
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
  profileCard: {
    width: '100%',
    minHeight: 600,
    backgroundColor: '#FFF',
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
    width: 60,
    height: 60,
    borderRadius: 43,
    backgroundColor: '#bddcc8ae',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FFF',
  },

  headerProfileRow: {
  flexDirection: 'row',
  alignItems: 'center',
  width: '100%',
  marginBottom: 16,
},
headerTextWrapper: {
  flex: 1,
  marginLeft: 16,
  justifyContent: 'center',
  alignItems: 'flex-start', // Alinea el texto a la izquierda
},
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#57585a',
    marginBottom: 6,
  },
  roleTag: {
    backgroundColor: '#66a37a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 0,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
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
    backgroundColor: '#e7e8eb90',
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
    width: '80%',
    minHeight: 0,
    backgroundColor: '#c61f1fd7',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    shadowColor: '#c61f1f',
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
  suplenteBox: {
    marginTop: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 14,
    width: '100%',
  },
  suplenteBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  suplenteBoxTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  suplenteBoxDesc: {
    fontSize: 12.5,
    color: '#1E3A8A',
    lineHeight: 18,
    marginBottom: 10,
  },
  revokeSuplenteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  revokeSuplenteBtnText: {
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
