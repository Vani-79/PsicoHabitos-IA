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

const PROFILE_COLORS = PSYCHOLOGIST_COLORS.perfil;

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
        const data = await authService.getPsychologistProfile(user?.email);
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

  const rawFullName = profile?.nombre || user?.name || doctorName;
  const cleanFullName = rawFullName.replace(/^Ps\.\s*/i, '').trim();
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
          <ActivityIndicator size="large" color={PROFILE_COLORS.primary} />
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

      //NOMBRE DE ESPECIALISTA
      <View style={styles.profileCard}>      
        <Text style={styles.profileName}>Ps. {cleanFullName}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>ESPECIALISTA REGISTRADO</Text>
        </View>

        <View style={styles.infoSection}>

          {/* Campo 1: Nombre */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="person-outline" size={18} color={PROFILE_COLORS.iconosPerfil} />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Nombre completo</Text>
              <Text style={styles.infoValue}>{cleanFullName}</Text>
            </View>
          </View>

          {/* Campo 2: Correo */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="mail-outline" size={18} color={PROFILE_COLORS.iconosPerfil} />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Correo electrónico</Text>
              <Text style={styles.infoValue}>{emailDisplay}</Text>
            </View>
          </View>

          {/* Campo 3: Fecha de Ingreso */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="calendar-outline" size={18} color={PROFILE_COLORS.iconosPerfil} />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Ingreso desde</Text>
              <Text style={styles.infoValue}>{fechaIngresoDisplay}</Text>
            </View>
          </View>

          {/* Campo 4: Fecha de Vencimiento de la Suscripción */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons
                name="hourglass-outline"
                size={18}
                color={isActivo ? PROFILE_COLORS.primary : PROFILE_COLORS.iconosPerfil}
              />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Suscripción activa hasta</Text>
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
                color={PROFILE_COLORS.iconosPerfil}
              />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoLabel}>Estado suscripción</Text>
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

        {/* Acceso directo a cambio de perfil si el usuario tiene rol dual */}
        {canSwitchToPatient && (
          <TouchableOpacity
            style={styles.switchRoleCard}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert(
                'Cambiar de Perfil',
                '¿Deseas cambiar al perfil de Paciente?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Cambiar',
                    onPress: async () => {
                      const res = await switchRole('paciente');
                      if (!res.success) {
                        Alert.alert('Error al cambiar de perfil', res.error || 'No se pudo cambiar al perfil de paciente.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.switchRoleIconWrapper}>
              <Ionicons name="person" size={18} color={PROFILE_COLORS.iconosPerfil} />
            </View>
            <View style={styles.switchRoleTextWrapper}>
              <Text style={styles.switchRoleTitle}>Portal Paciente</Text>
              <Text style={styles.switchRoleSubtitle}>Cambiar a vista de paciente</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={PROFILE_COLORS.textoSecundario} />
          </TouchableOpacity>
        )}

        {/* Botón rojo de Cerrar Sesión */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogoutPress}
        >
          <Ionicons name="log-out-outline" size={20} color={PROFILE_COLORS.surface} style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  };



  //PENDIENTE DE VER
  return (
    <SafeAreaView style={styles.container}>
      {/* Encabezado limpio 'Mi Perfil' */}
      <ProfileRoleHeader title="Mi Perfil" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileContent()}
      </ScrollView>

      {/* Barra de navegación inferior */}
      <PsychologistBottomNav activeTab="perfil" onChangeTab={onNavigateTab} />
    </SafeAreaView>
  );
};




// ESTILOS DE PERFIL
const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: PROFILE_COLORS.fondoBase },

  scrollContent: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

 profileCard: {
    width: '100%',
    backgroundColor: PROFILE_COLORS.fondoTarjeta,
    paddingVertical: 20,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    elevation: 1,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.bordeTarjeta, 
  },
  
  loadingCard: {
    width: '100%',
    backgroundColor: PROFILE_COLORS.surface,
    borderRadius: 22,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PROFILE_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: PROFILE_COLORS.textoSecundario,
    fontWeight: '600',
  },

  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: PROFILE_COLORS.textoPrincipal,
    marginBottom: 6,
  },

  roleTag: {
    backgroundColor: PROFILE_COLORS.fondoiconos,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 24,
  },

  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: PROFILE_COLORS.textoSec,
    letterSpacing: 0.5,
  },

  infoSection: {
    width: '100%',
    paddingTop: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },

  //fondo iconos
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PROFILE_COLORS.fondoiconos,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  infoTextWrapper: {
    flex: 1,
  },

  //texto titulos nombre etc
  infoLabel: {
    fontSize: 13,
    color: PROFILE_COLORS.textoPrincipal,
    fontWeight: '500',
  },

  //texto subtitulos
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: PROFILE_COLORS.textoSecundario,
    marginTop: 2,
  },

  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusActiveText: {
    color: PROFILE_COLORS.estadoActivo,
  },

  statusInactiveText: {
    color: PROFILE_COLORS.estadoInactivo,
  },

  logoutButton: {
    width: '45%',
    backgroundColor: PROFILE_COLORS.estadoInactivo,
    borderRadius: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 30,
    elevation: 1,
  },

  logoutIcon: {
    marginRight: 6,    
  },

  logoutButtonText: {
    color: PROFILE_COLORS.textoBlanco,
    fontSize: 13,
    fontWeight: '600',
  },

  switchRoleCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PROFILE_COLORS.fondoiconos,
    borderRadius: 14,
    padding: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: PROFILE_COLORS.bordeTarjeta,
  },
  switchRoleIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PROFILE_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  switchRoleTextWrapper: {
    flex: 1,
  },
  switchRoleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PROFILE_COLORS.textoPrincipal,
  },
  switchRoleSubtitle: {
    fontSize: 12,
    color: PROFILE_COLORS.textoSecundario,
    marginTop: 2,
  },
});
