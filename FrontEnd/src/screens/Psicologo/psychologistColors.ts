
// Marca, texto principal y navegación; Calendario y Perfil personalizan la sombra.
const SHARED_FOUNDATION = {
  primary: '#82bda1',
  shadow: '#82bda1',
  textPrimary: '#1F2937',
  textMuted: '#6B7280',
  navigation: {
    background: '#FFFFFF',
    border: '#E5E7EB',
    active: '#0F613B',
    inactive: '#9CA3AF',
  },
};

// Roles idénticos en Pacientes, Calendario y Perfil.
const SHARED_CLINICAL_BASE = {
  canvas: '#EAF5EE',
  surface: '#FFFFFF',
  surfaceGreenSoft: '#F0FDF4',
  surfaceMuted: '#F3F4F6',
  danger: '#DC2626',
};

// Roles compartidos específicamente entre Pacientes y Calendario.
const SHARED_PATIENT_CALENDAR = {
  canvasSubtle: '#F8FAF9',
  surfaceSubtle: '#F9FAFB',
  border: '#E5E7EB',
  borderPale: '#EDF2F7',
  textStrong: '#111827',
  textBody: '#374151',
  textSecondary: '#4B5563',
  textSubtle: '#9CA3AF',
  textOnPrimaryMuted: '#D1FAE5',
  textWarningStrong: '#92400E',
  dangerSurface: '#FEE2E2',
  warningSurface: '#FEF3C7',
  info: '#1D4ED8',
  infoSurface: '#EFF6FF',
  infoBorder: '#BFDBFE',
};

// Etiquetas que se repiten en Inicio y Pacientes.
const SHARED_BADGES = {
  substituteBadge: '#EFF6FF',
  coverBadge: '#FFFBEB',
};

// Bordes con los mismos roles y valores en Inicio y Pacientes.
const SHARED_HOME_PATIENT_BORDERS = {
  borderDisabled: '#D1D5DB',
  borderDanger: '#FCA5A5',
  borderDangerSoft: '#FECACA',
  borderInfo: '#BFDBFE',
  borderWarning: '#FDE68A',
};

const SHARED_GREEN_TEXT = {
  textGreenSubtle: '#6B8577',
};

// Las iniciales usan la misma paleta en Inicio y en el directorio de Pacientes.
const SHARED_AVATAR_COLORS = {
  blue: { background: '#E6EEF8', text: '#2F5A8A' },
  sand: { background: '#F5ECE4', text: '#8A5A2F' },
  lavender: { background: '#EEEAF6', text: '#5A4A8A' },
  green: { background: '#E8F5EE', text: '#82bda1' },
  rose: { background: '#F8E8EC', text: '#8A3A4F' },
  turquoise: { background: '#E6F3F4', text: '#2F6F75' },
};

export const PSYCHOLOGIST_COLORS = {
  // Pestaña Inicio: saludo, agenda de hoy, controles y estados.
  inicio: {
    ...SHARED_FOUNDATION,
    ...SHARED_BADGES,
    ...SHARED_HOME_PATIENT_BORDERS,
    ...SHARED_GREEN_TEXT,

    // Fondos de pantalla, tarjetas, filas y etiquetas.
    page: '#9dd2d333',
    card: '#FFF',
    listItem: '#d2e4e874',
    highlight: '#d2e4e874',
    highlightSoft: '#F3FAF6',
    activeControl: '#E2F3E9',
    disabledControl: '#E5E7EB',
    disabledButton: '#F3F4F6',
    cancelledBadge: '#FEE2E2',

    // Bordes de tarjetas, buscador, controles y estados.
    borderCard: '#E7F0EA',
    borderAction: '#D3EBDD',
    borderListItem: '#D9E4DE',
    // Textos de Inicio.
    textSubtle: '#9CA3AF',
    textGreenAccent: '#4F7A64',
    textGreenBrand: '#1B8A5A',
    textError: '#991B1B',
    textErrorSecondary: '#7F1D1D',
    textInfo: '#1D4ED8',
    textWarning: '#B45309',
    textDanger: '#DC2626',

    // Iconos de Inicio.
    iconPrimary: '#82bda1',
    iconAccent: '#bac462',
    iconDisabled: '#D1D5DB',
    iconError: '#991B1B',

    avatarColors: SHARED_AVATAR_COLORS,
  },

  // Pestaña Pacientes: listado, detalle, registro y reporte de hábitos.
  pacientes: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    ...SHARED_PATIENT_CALENDAR,
    ...SHARED_BADGES,
    ...SHARED_HOME_PATIENT_BORDERS,
    ...SHARED_GREEN_TEXT,
    // Marca y acentos de las pantallas de pacientes.
    primaryAlt: '#1A7A54',
    accent: '#268D77',
    brandAccent: '#3FB889',
    subscriptionErrorText: '#991B1B',
    subscriptionErrorSecondary: '#7F1D1D',

    avatarColors: SHARED_AVATAR_COLORS,

    // Fondos de pantalla, tarjetas, formularios, etiquetas y gráficas.
    surfaceGreen: '#E8F5E9',
    surfaceHighlight: '#E8F5EE',
    surfaceHighlightSoft: '#F3FAF6',
    surfaceNeutral: '#FAFAFA',
    surfaceSlate: '#F1F5F9',
    surfaceSlateSubtle: '#F8FAFC',
    surfaceChart: '#FCFDFD',
    directorySearch: '#9dd2d333',
    directoryListItem: '#d2e4e874',
    directoryHighlight: '#1B8A5A',
    directoryHintBackground: '#d2e4e874',
    directoryHintIcon: '#bac462',
    directoryBorder: '#D9E4DE',

    // Bordes de tarjetas, campos, estados y paginación.
    borderSoft: '#E2E8F0',
    borderGreenAccent: '#A5C1B3',
    borderGreenSoft: '#E7F0EA',
    borderMint: '#C6E7D6',
    borderMintSoft: '#CBE5D6',
    borderSlate: '#CBD5E1',
    borderNeutral: '#F0F0F0',

    // Textos de pacientes, formularios, reporte y estados.
    textOnGreenMuted: '#D1E7DD',
    textSlate: '#64748B',
    textSlateStrong: '#475569',
    textSlateDark: '#334155',
    textNavy: '#0F172A',
    textNavySecondary: '#1E293B',
    textGray: '#4A5568',
    textGrayMuted: '#718096',
    textGrayStrong: '#2D3748',
    textGreenMuted: '#60756D',
    textGreenSuccess: '#166534',
    textWarningDark: '#78350F',
    textInfoStrong: '#1E40AF',
    textInfoDark: '#1E3A8A',

    // Estados: iconos, etiquetas, mensajes y áreas de las gráficas.
    dangerBright: '#EF4444',
    warning: '#B45309',
    warningBright: '#D97706',
    warningSurfaceSoft: '#FFFBEB',
    infoBlue: '#0284C7',
    infoBlueBright: '#3B82F6',
    infoBlueSurface: '#E0F2FE',
    successBright: '#16A34A',
    successMint: '#A8DED3',
    successSurface: '#DCFCE7',

    // Colores de las series del reporte y detalles de sus gráficas.
    habitFood: '#D97706',
    habitExercise: '#16A34A',
    habitExerciseSurface: '#DCFCE7',
    habitHydration: '#0284C7',
    habitHydrationSurface: '#E0F2FE',
    habitSleep: '#7C3AED',
    habitSleepSurface: '#EDE9FE',
    habitAnxiety: '#E11D48',
    habitAnxietySurface: '#FFE4E6',
    habitStress: '#2563EB',
    habitStressSurface: '#DBEAFE',
    chartPointTransparent: '#0F172A40',
    chartGradientEnd: '#34D399',
    chartEmptyState: '#94A3B8',
    modalBackdrop: 'rgba(0,0,0,0.45)',
    headerOverlay: 'rgba(255,255,255,0.2)',
  },

  // Pestaña Calendario: agenda semanal, sesiones, disponibilidad y estados.
  calendario: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    ...SHARED_PATIENT_CALENDAR,
    // Colores propios del calendario.
    shadow: '#000000',
    borderGreen: '#A7F3D0',
    onlineSession: '#2563EB',
    availableSlot: '#10B981',
  },

  // Pestaña Perfil: datos del profesional, suscripción y acciones de cuenta.
  perfil: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    shadow: '#000000',
    profileSurface: '#E4EDE7',
    profileBorder: '#A5C1B3',
  },
} as const;
