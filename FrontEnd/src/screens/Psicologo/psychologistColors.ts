//COLORES GENERALES
const SHARED_FOUNDATION = {
  primary: '#1aca78',
  shadow: '#82bda1',
  fondoBase: '#FFFFFF', //fondo general  
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
  textBody: '#202b36af', //letra horas calendario
  textSubtle: '#202b36af', //letra observaciones



  //nose
  textSecondary: '#4B5563', 
  textWarningStrong: '#92400E',
  dangerSurface: '#FEE2E2',
 
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
  blue: { background: '#dbeafe', text: '#1e3a8a' },
  sand: { background: '#fef3c7', text: '#78350f' },
  lavender: { background: '#ede9fe', text: '#4c1d95' },
  green: { background: '#bbf7d0', text: '#111827' },
  rose: { background: '#ffe4e6', text: '#881337' },
  turquoise: { background: '#ccfbf1', text: '#134e4a' },
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

   
    avatarColors: SHARED_AVATAR_COLORS,
    fondoClaro: '#9dd2d333',
    bordeHistorial: '#6ca5a998',
    textoHora: '#dc833ad3',
    estadoCompletada: '#4bbf7c',
    textoProgramada: '#6c6a6a',










    // ERRORES DE SUSCRIPCIÓN
    subscriptionErrorText: '#991B1B',
    subscriptionErrorSecondary: '#7F1D1D',

    // FONDOS DE PANTALLA, TARJETAS, BÚSQUEDA Y GRÁFICAS
    directoryListItem: '#d2e4e874',
    directoryHighlight: '#1B8A5A',
    directoryBorder: '#D9E4DE',

    // BORDES DE TARJETAS, CAMPOS, ESTADOS Y PAGINACIÓN
    borderSoft: '#E2E8F0',

    // TEXTOS DE PACIENTES, FORMULARIOS, REPORTE Y ESTADOS
    textGreenSuccess: '#166534',
    textWarningDark: '#78350F',
    textInfoStrong: '#1E40AF',
    textInfoDark: '#1E3A8A',

    // ESTADOS, ALERTAS Y MENSAJES
    dangerBright: '#EF4444',
    warning: '#B45309',
    warningBright: '#D97706',
    warningSurfaceSoft: '#FFFBEB',
    infoBlueBright: '#3B82F6',

    //INFORME DE HABITOS
    comida: '#f5bc5a',
    fondoComida: '#FEF3C7',

    ejercicio: '#9acb94',
    fondoEjercicio: '#DCFCE7',

    hidratacion: '#95bfcd',
    fondoHidratacion: '#E0F2FE',

    sueño: '#c2b2db',
    fondoSueño: '#EDE9FE',

    ansiedad: '#d1a0a4',
    fondoAnsiedad: '#FFE4E6',

    estres: '#a6bad2',
    fondoEstres: '#DBEAFE',

    modalBackdrop: 'rgba(0,0,0,0.45)',
   
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
    fondoTarjeta: '#FFFFFF',
    bordeTarjeta:  '#a2a2a21b',
    estadoActivo: '#4eb86cce',
    estadoInactivo: '#DC2626',
    textoBlanco: '#FFFFFF',
    textoSec: '#6ca5a9',   
  },
} as const;
