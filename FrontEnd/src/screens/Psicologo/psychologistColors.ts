
// Marca, texto principal y navegación; Calendario y Perfil personalizan la sombra.
const SHARED_FOUNDATION = {
  primary: '#1aca78',
  shadow: '#82bda1',
  textPrimary: '#1F2937',
  textMuted: '#6B7280',
  fondoBase: '#FFFFFF',

  //COLORES GENERALES
  textoPrincipal: '#343131',
  textoSecundario: '#797474',



  //COLORES DE BARRA NAVEGACION
  navigation: {
    background: '#bee5e63b',
    border: '#FFF',
    active: '#4fb7dc', //NAVEGACION
    inactive: '#9CA3AF',
  },
};

// Roles idénticos en Pacientes, Calendario y Perfil.
const SHARED_CLINICAL_BASE = {
  canvas: '#babcbc27', //fondo presencial, completada en calendario
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
    ...SHARED_BADGES,
    ...SHARED_HOME_PATIENT_BORDERS,
    ...SHARED_GREEN_TEXT, 

    //PESTAÑA INICIO 

    page: '#FFFFFF', //fondo
    textGreenBrand: '#6ca5a9', //ver calendario
    textSubtle: '#999a9cb7',
    iconPrimary: '#6ca5a9', //icono mas
    activeControl: '#d4d9da9d', //fondo icono mas
    iconAccent: '#6ca5a9', //flecha registrar nuevo paciente
    card: '#FFFFFF', // fondo tarjeta agenda del dia
    listItem: '#ecf6f7f5', // fondo tarjeta de pacientes inicio    
    highlightSoft: '#ecf6f7f5', //fondo tarjeta de registrar
    borderCard: '#599eaa42', //borde agenda del dia
    borderAction: '#599eaa42', //borde boton registrar nuevo p
    borderListItem: '#599eaa42', //borde tarjeta pacientes
    



    // nose
    textGreenAccent: '#436654',
    iconDisabled: '#c1d2ec',
    disabledButton: '#F3F4F6',
    highlight: '#81bcc974',
    disabledControl: '#E5E7EB',
    cancelledBadge: '#FEE2E2',


    //Errores
    textError: '#991B1B',
    textErrorSecondary: '#7F1D1D',
    textInfo: '#1D4ED8',
    textWarning: '#B45309',
    textDanger: '#DC2626',
    iconError: '#991B1B',

    avatarColors: SHARED_AVATAR_COLORS,
  },



  //---------------------------------------//

  pacientes: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    ...SHARED_PATIENT_CALENDAR,
    ...SHARED_BADGES,
    ...SHARED_HOME_PATIENT_BORDERS,
    ...SHARED_GREEN_TEXT,

    // PACIENTES PESTAÑA
    primaryAlt: '#9fa7a8be', //icono registro habitos
    accent: '#43dcbb', //ELIMINAR
    brandAccent: '#3bbb8a', //ELIMINAR

    //nose
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
    textGrayStrong: '#0d2753',
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

  // PERFIL PESTAÑA
  perfil: {
    ...SHARED_FOUNDATION,
    ...SHARED_CLINICAL_BASE,
    shadow: '#868888d5',
    fondoiconos: '#d4d9da38', //fondo iconos
    profileBorder: '#FFFFFF', //borde icono
    fondoTarjeta: '#FFFFFF',
    bordeTarjeta:  '#64b1be38',
    estadoActivo: '#4eb56dce',
    
  },
} as const;
