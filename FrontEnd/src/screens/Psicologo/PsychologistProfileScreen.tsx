import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PsychologistBottomNav, PsychologistTab } from '../../components/PsychologistBottomNav';
import { ProfileRoleHeader } from '../../components/ProfileRoleHeader';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { PsychologistProfileData } from '../../constants/auth';
import { formatToChileanDate } from '../../utils/date';
import { PSYCHOLOGIST_COLORS } from './psychologistColors';

interface PsychologistProfileScreenProps {
  onNavigateTab: (tab: PsychologistTab) => void;
  doctorName?: string;
  onLogout?: () => void;
}

export const PsychologistProfileScreen: React.FC<PsychologistProfileScreenProps> = ({
  onNavigateTab,
  doctorName = 'Especialista',
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const { user, switchRole, logout } = useAuth();
  const [profile, setProfile] = useState<PsychologistProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await authService.getPsychologistProfile();
        if (isMounted && data) {
          setProfile(data);
        }
      } catch (err) {
        console.warn('Error al cargar perfil del especialista desde MySQL:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const fullName = profile?.nombre || user?.name || doctorName;
  const emailDisplay = profile?.email || user?.email || 'No registrado';

  const canSwitchToPatient =
    Boolean(user?.hasMultipleRoles) ||
    Boolean(profile?.hasMultipleRoles) ||
    Boolean(user?.availableRoles?.includes('paciente')) ||
    Boolean(profile?.availableRoles?.includes('paciente'));

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
            if (onLogout) {
              onLogout();
            } else {
              void logout();
            }
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
          <ActivityIndicator size="large" color={PSYCHOLOGIST_COLORS.primary} />
          <Text style={styles.loadingText}>Cargando datos desde la base de datos...</Text>
        </View>
      );
    }

    const fechaIngresoDisplay = profile?.fechaIngreso
      ? formatToChileanDate(profile.fechaIngreso)
      : 'No registrada';
    const estadoSuscripcionDisplay = profile?.estadoSuscripcion || (user?.subscription?.isActive ? 'Activo' : 'Inactivo');
    const isActivo = estadoSuscripcionDisplay === 'Activo';
    const fechaVencimientoActiva =
      profile?.fechaVencimiento && profile.fechaVencimiento !== 'Vencida'
        ? profile.fechaVencimiento
        : (user?.subscription?.finDate || 'No registrada');
    const fechaVencimientoRaw = !isActivo ? 'Vencida' : fechaVencimientoActiva;
    const fechaVencimientoDisplay = fechaVencimientoRaw === 'Vencida' || fechaVencimientoRaw === 'No registrada'
      ? fechaVencimientoRaw
      : formatToChileanDate(fechaVencimientoRaw);

    return (
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={42} color={PSYCHOLOGIST_COLORS.primary} />
        </View>
        <Text style={styles.profileName}>{fullName}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>ESPECIALISTA REGISTRADO</Text>
        </View>

        <View style={styles.infoSection}>
          {/* Campo 1: Nombre */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="person-outline" size={18} color={PSYCHOLOGIST_COLORS.primary} />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>{fullName}</Text>
            </View>
          </View>

          {/* Campo 2: Correo */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="mail-outline" size={18} color={PSYCHOLOGIST_COLORS.primary} />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Correo</Text>
              <Text style={styles.infoValue}>{emailDisplay}</Text>
            </View>
          </View>

          {/* Campo 3: Fecha de Ingreso */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="calendar-outline" size={18} color={PSYCHOLOGIST_COLORS.primary} />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Fecha de Ingreso</Text>
              <Text style={styles.infoValue}>{fechaIngresoDisplay}</Text>
            </View>
          </View>

          {/* Campo 4: Fecha de Vencimiento de la Suscripción */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons
                name="hourglass-outline"
                size={18}
                color={isActivo ? PSYCHOLOGIST_COLORS.primary : PSYCHOLOGIST_COLORS.danger}
              />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Fecha de Vencimiento de la Suscripción</Text>
              <Text
                style={[
                  styles.infoValue,
                  !isActivo && styles.statusInactiveText,
                ]}
              >
                {fechaVencimientoDisplay}
              </Text>
            </View>
          </View>

          {/* Campo 5: Estado de la suscripción */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons
                name={isActivo ? 'shield-checkmark-outline' : 'alert-circle-outline'}
                size={18}
                color={isActivo ? PSYCHOLOGIST_COLORS.primary : PSYCHOLOGIST_COLORS.danger}
              />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Estado de la suscripción</Text>
              <View style={styles.statusBadgeRow}>
                <Text
                  style={[
                    styles.infoValue,
                    isActivo ? styles.statusActiveText : styles.statusInactiveText,
                  ]}
                >
                  {estadoSuscripcionDisplay}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Encabezado con selector de rol desplegable desde 'Mi Perfil' */}
      <ProfileRoleHeader
        title="Mi Perfil"
        currentRole="psicologo"
        canSwitch={canSwitchToPatient}
        onSwitchRole={async (targetRole) => {
          const success = await switchRole(targetRole);
          if (!success) {
            Alert.alert('Error', 'No se pudo cambiar al perfil de paciente.');
          }
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileContent()}

        {/* Botón rojo de Cerrar Sesión */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogoutPress}
        >
          <Ionicons name="log-out-outline" size={20} color={PSYCHOLOGIST_COLORS.surface} style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Barra de navegación inferior */}
      <PsychologistBottomNav activeTab="perfil" onChangeTab={onNavigateTab} />
    </SafeAreaView>
  );
};

// Estilos del perfil profesional, la suscripción y las acciones de cuenta.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PSYCHOLOGIST_COLORS.canvas },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  profileCard: {
    width: '100%',
    backgroundColor: PSYCHOLOGIST_COLORS.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: PSYCHOLOGIST_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingCard: {
    width: '100%',
    backgroundColor: PSYCHOLOGIST_COLORS.surface,
    borderRadius: 22,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PSYCHOLOGIST_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: PSYCHOLOGIST_COLORS.textMuted,
    fontWeight: '500',
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
    color: PSYCHOLOGIST_COLORS.textPrimary,
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
    color: PSYCHOLOGIST_COLORS.primary,
    letterSpacing: 0.5,
  },
  infoSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: PSYCHOLOGIST_COLORS.surfaceMuted,
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
    backgroundColor: PSYCHOLOGIST_COLORS.surfaceGreenSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: PSYCHOLOGIST_COLORS.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: PSYCHOLOGIST_COLORS.textPrimary,
    marginTop: 2,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusActiveText: {
    color: PSYCHOLOGIST_COLORS.primary,
  },
  statusInactiveText: {
    color: PSYCHOLOGIST_COLORS.danger,
  },
  logoutButton: {
    width: '100%',
    backgroundColor: PSYCHOLOGIST_COLORS.danger,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: PSYCHOLOGIST_COLORS.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutButtonText: {
    color: PSYCHOLOGIST_COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
