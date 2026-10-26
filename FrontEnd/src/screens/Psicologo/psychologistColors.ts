
// Marca, texto principal y navegación; Calendario y Perfil personalizan la sombra.
const SHARED_FOUNDATION = {
  primary: '#1aca78',
  shadow: '#82bda1',
  fondoBase: '#FFFFFF', //fondo general

  //COLORES GENERALES
  textoPrincipal: '#343131', //negro
  textoSecundario: '#797474', //gris
  textoBlanco: '#FFFFFF',
  iconosPerfil: '#6ca5a9', //color iconos
  fondoiconos: '#d4d9da47', //fondo iconos
  bordeIconos: '#96969639', //borde iconos
 

  //COLORES DE BARRA NAVEGACION
  navigation: {
    background: '#bee5e63b',
    border: '#FFF',
    active: '#6ca5a9', //NAVEGACION
    inactive: '#9CA3AF',
  },
};

// Roles idénticos en Pacientes, Calendario y Perfil.
const SHARED_CLINICAL_BASE = {
  
  surface: '#FFFFFF', //MODIFICAR PORQUE ES EL FONDO DE TARJETAS EN FICHA PACIENTE
  surfaceGreenSoft: '#ecf6f7f5', //fondo de iconos en perfil
  surfaceMuted: '#babcbc6c', //linea divisora en perfil 
  danger: '#ce0c0c', //color cerrar sesion
};

const SHARED_PATIENT_CALENDAR = {

  //CALENDARIO PESTAÑA
  canvasSubtle: '#FFFFFF', //fondo paciente y calendario
  surfaceSubtle: '#ecf6f7f5', //fondo calendario nros
  border: '#E5E7EB', //lineas y bordes calendario
  borderPale: '#cbd0d133', //borde en calendario 
  textStrong: '#202b36af', //letra numeros calendario
  textBody: '#202b36af', //letra horas calendario
  textSubtle: '#202b36af', //letra observaciones



  //nose
  textSecondary: '#4B5563', 
  textOnPrimaryMuted: '#0a5491',
  textWarningStrong: '#92400E',
  dangerSurface: '#FEE2E2',
  warningSurface: '#FEF3C7',
  info: '#1D4ED8',
  infoSurface: '#EFF6FF',
  infoBorder: '#BFDBFE',



  
  
  
  
};







// Etiquetas que se repiten en Inicio y Pacientes.
const SHARED_BADGES = {
  //nose
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
  textGreenSubtle: '#727375', //edad paciente
};

// COLORES DE INICIALES E ICONO CON EL NOMBRE DE PACIENTE
const SHARED_AVATAR_COLORS = {
  blue: { background: '#FFFFFF', text: '#2f598aaf' },
  sand: { background: '#FFFFFF', text: '#cb9e76bd' },
  lavender: { background: '#FFFFFF', text: '#5a4a8aba' },
  green: { background: '#FFFFFF', text: '#82bda1ad' },
  rose: { background: '#FFFFFF', text: '#8a3a4fb3' },
  turquoise: { background: '#FFFFFF', text: '#2f6f75b1' },
};



//-------------------------//


export const PSYCHOLOGIST_COLORS = {
  inicio: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    ...SHARED_BADGES,
    ...SHARED_HOME_PATIENT_BORDERS,

    // COLORES PROPIOS DE INICIO
    shadow: '#868888d5',
    cancelledBadge: '#FEE2E2',
    directoryTextSubtle: '#999a9cb7',

    // ESTADOS Y ERRORES
    textError: '#991B1B',
    textErrorSecondary: '#7F1D1D',
    textInfo: '#1D4ED8',
    textWarning: '#B45309',
    textDanger: '#DC2626',
    iconError: '#991B1B',

    avatarColors: SHARED_AVATAR_COLORS,
  },



  // MIS PACIENTES PESTAÑA
  pacientes: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    ...SHARED_PATIENT_CALENDAR,
    ...SHARED_BADGES,
    ...SHARED_HOME_PATIENT_BORDERS,
    ...SHARED_GREEN_TEXT,

    // COLORES PROPIOS DE PACIENTES
    primaryAlt: '#9fa7a8be',
    accent: '#43dcbb',
    brandAccent: '#3bbb8a',
    avatarColors: SHARED_AVATAR_COLORS,

    // ERRORES DE SUSCRIPCIÓN
    subscriptionErrorText: '#991B1B',
    subscriptionErrorSecondary: '#7F1D1D',

    // FONDOS DE PANTALLA, TARJETAS, BÚSQUEDA Y GRÁFICAS
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

    // BORDES DE TARJETAS, CAMPOS, ESTADOS Y PAGINACIÓN
    borderSoft: '#E2E8F0',
    borderGreenAccent: '#A5C1B3',
    borderGreenSoft: '#E7F0EA',
    borderMint: '#C6E7D6',
    borderMintSoft: '#CBE5D6',
    borderSlate: '#CBD5E1',
    borderNeutral: '#F0F0F0',

    // TEXTOS DE PACIENTES, FORMULARIOS, REPORTE Y ESTADOS
    textOnGreenMuted: '#D1E7DD',
    textSlate: '#64748B',
    textSlateStrong: '#475569',
    textSlateDark: '#334155',
    textNavy: '#0F172A',
    textNavySecondary: '#1E293B',
    textGray: '#4A5568',
    textGrayMuted: '#718096',
    textGrayStrong: '#0d2753',
    textGreenMuted: '#60756D',
    textGreenSuccess: '#166534',
    textWarningDark: '#78350F',
    textInfoStrong: '#1E40AF',
    textInfoDark: '#1E3A8A',

    // ESTADOS, ALERTAS Y MENSAJES
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

    // SERIES Y DETALLES DE GRÁFICAS
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


  




  // REGISTRO PACIENTE PESTAÑA
  registroPaciente: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    
    shadow: '#868888d5',
    textGreenSuccess: '#166534',
    textInfoStrong: '#1E40AF',
    textInfoDark: '#1E3A8A',
    textWarningStrong: '#92400E',
    dangerBright: '#EF4444',
    danger: SHARED_CLINICAL_BASE.danger,
    info: '#1D4ED8',
    infoSurface: '#EFF6FF',
    warningSurface: '#FEF3C7',
    warningBright: '#D97706',
    infoBlueBright: '#3B82F6',
  },

  // CALENDARIO PESTAÑA 
  calendario: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    ...SHARED_PATIENT_CALENDAR,

    shadow: '#000000',
    bordeCalendar: '#a2a2a21b',
    onlineSession: '#2563EB',
    availableSlot: '#10B981',
    textoHora: '#e18539',
    estadoCompletada: '#45b087',
    estadoReagendar: '#e18539',
    estadoCancelada: '#d83232',
  },

  // PERFIL PESTAÑA 
  perfil: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    shadow: '#868888d5',
    profileBorder: '#FFFFFF', 
    fondoTarjeta: '#FFFFFF',
    bordeTarjeta:  '#a2a2a21b',
    estadoActivo: '#4eb86cce',
    estadoInactivo: '#DC2626',
    textoBlanco: '#FFFFFF',
    fondoPerfil: '#6ca5a9',
    textoSec: '#6ca5a9',   
  },
} as const;
