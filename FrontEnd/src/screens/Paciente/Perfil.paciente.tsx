import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PatientBottomNav, PatientTab } from '../../components/Iconosbarrapaciente';
import { patientService } from '../../services/patientService';
import { PatientProfileData } from '../../types/patient';
import { formatToChileanDate } from '../../utils/date';

const COLORS = {
  // Superficies
  screenBg: '#EAF5EE',
  cardBg: '#FFFFFF',
  divider: '#E9EEF0',
  border: '#0b6d370e',

  // Perfil
  roleTagBg: '#414a4587', //tarjeta paciente registrado o no 
  avatarBg: '#dbede2a1', //icono de perfil
  avatarIcon: '#9ebcbbd8', //icono
  textDark: '#25362d9b',
  registerText: '#ffffff',
  textMuted: '#6B7280',
  textWhite: '#FFFFFF',
  infoIconBg: '#e2e7e470',
  infoIconColor: '#1f2c25',

  // Suplencia
  suplenteBg: '#EFF6FF',
  suplenteBorder: '#BFDBFE',
  suplenteTitle: '#1D4ED8',
  suplenteText: '#1E3A8A',
  revokeBg: '#FEE2E2',
  revokeBorder: '#FECACA',
  revokeText: '#DC2626',

  // Acción de cerrar sesión
  logoutBg: '#c61f1fd7',
};

const formatAge = (edad?: number | string, birthDateStr?: string): string => {
  if (birthDateStr) {
    const birthDate = new Date(birthDateStr);
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0) return `${calculatedAge} años`;
    }
  }
  return edad ? `${edad} años` : 'No registrada';
};

interface InfoItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrapper}>
      <Ionicons name={icon} size={18} color={COLORS.infoIconColor} />
    </View>
    <View style={styles.infoTextWrapper}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'No registrado'}</Text>
    </View>
  </View>
);

interface PatientProfileScreenProps {
  onNavigateTab: (tab: PatientTab) => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

export const PatientProfileScreen: React.FC<PatientProfileScreenProps> = ({
  onNavigateTab,
  userName = 'Paciente',
  userEmail,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await patientService.getPatientProfile(userEmail, userName);
      setProfile(data);
    } catch (err) {
      console.warn('Error al cargar perfil:', err);
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
      `Se revocará inmediatamente el acceso temporal de ${suplenteName} a tu ficha e historial clínico.`,
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
              Alert.alert('Suplencia revocada', res.message || 'Acceso revocado con éxito.');
              void loadProfile();
            } else {
              Alert.alert('Error', res.error || 'No se pudo revocar la suplencia.');
            }
          },
        },
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: () => onLogout?.() },
    ]);
  };

  const fullName = profile
    ? [profile.nombre, profile.apellido_paterno, profile.apellido_materno].filter(Boolean).join(' ') || userName
    : userName;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 80, 100) },
        ]}
      >
        <View style={styles.cardBase}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.roleTagBg} />
          ) : profile ? (
            <>
              {/* Encabezado Perfil */}
              <View style={styles.headerProfileRow}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={26} color={COLORS.avatarIcon} />
                </View>
                <View style={styles.headerTextWrapper}>
                  <Text style={styles.profileName}>{fullName}</Text>
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>PACIENTE REGISTRADO</Text>
                  </View>
                </View>
              </View>

              {/* Lista de Información */}
              <View style={styles.infoSection}>
                <InfoItem icon="person-outline" label="Nombre" value={fullName} />
                <InfoItem
                  icon="hourglass-outline"
                  label="Edad"
                  value={formatAge(profile.edad, profile.fecha_nacimiento)}
                />
                <InfoItem
                  icon="calendar-outline"
                  label="Fecha de Nacimiento"
                  value={formatToChileanDate(profile.fecha_nacimiento)}
                />
                <InfoItem icon="mail-outline" label="Correo" value={profile.email || userEmail} />
                <InfoItem
                  icon="medkit-outline"
                  label="Especialista Titular"
                  value={profile.especialista || 'Sin especialista asignado'}
                />

                {/* Caja de Suplencia */}
                {profile.suplente && (
                  <View style={styles.suplenteBox}>
                    <View style={styles.suplenteBoxHeader}>
                      <Ionicons name="shield-checkmark" size={18} color={COLORS.suplenteTitle} />
                      <Text style={styles.suplenteBoxTitle}>Atención en Suplencia Activa</Text>
                    </View>
                    <Text style={styles.suplenteBoxDesc}>
                      Has autorizado temporalmente a <Text style={styles.boldText}>{profile.suplente.nombre}</Text> hasta el{' '}
                      <Text style={styles.boldText}>
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
                        <ActivityIndicator size="small" color={COLORS.revokeText} />
                      ) : (
                        <>
                          <Ionicons
                            name="close-circle-outline"
                            size={16}
                            color={COLORS.revokeText}
                            style={{ marginRight: 6 }}
                          />
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
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={COLORS.textWhite}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.emptyNote}>No se encontraron registros en la base de datos.</Text>
          )}
        </View>
      </ScrollView>

      <PatientBottomNav activeTab="profile" onNavigate={onNavigateTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },

  cardBase: {
    width: '100%',
    minHeight: 500,
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    elevation: 1,
  },

  // Cabecera del perfil
  emptyNote: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: { flex: 1, marginLeft: 16 },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  roleTag: {
    backgroundColor: COLORS.roleTagBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleTagText: { fontSize: 10, fontWeight: '500', color: COLORS.registerText },

  // Datos y detalles de suplencia
  infoSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.infoIconBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextWrapper: { flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },
  boldText: { fontWeight: '700' },
  suplenteBox: {
    marginTop: 14,
    backgroundColor: COLORS.suplenteBg,
    borderWidth: 1,
    borderColor: COLORS.suplenteBorder,
    borderRadius: 14,
    padding: 14,
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
    color: COLORS.suplenteTitle,
  },
  suplenteBoxDesc: {
    fontSize: 12.5,
    color: COLORS.suplenteText,
    lineHeight: 18,
    marginBottom: 10,
  },
  revokeSuplenteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.revokeBg,
    borderWidth: 1,
    borderColor: COLORS.revokeBorder,
    borderRadius: 10,
    paddingVertical: 8,
  },
  revokeSuplenteBtnText: {
    color: COLORS.revokeText,
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Acciones de cuenta
  logoutButton: {
    width: '50%',
    backgroundColor: COLORS.logoutBg,
    borderRadius: 9,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  logoutButtonText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '500',
  },
});