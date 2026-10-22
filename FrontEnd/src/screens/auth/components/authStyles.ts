import { StyleSheet } from 'react-native';

export const AUTH_COLORS = {
  // Texto: títulos, contenido y etiquetas.
  greenDark: '#218757ce',//nombre
  greenLight: '#2c9189a5', //nombre
  greenMutedText: '#555e59',
  grayGreen: '#8E9E96',
  gray400: '#9CA3AF',
  gray500: '#718096',
  gray600: '#6B7280',
  gray700: '#64748B',
  gray800: '#4A5568',
  gray900: '#374151',
  charcoal: '#1F2937',
  heading: '#2D3748',
  greenCheck: '#a0a29ecc', // COLOR CHECKBOX

  // Fondos: superficies, campos e insignias.
  white: '#FFFFFF',
  greenSoft: '#E8F5E9',
  greenSubtle: '#F2F8F4',
  greenMuted: '#9FB8AA',
  welcomeBackground: '#ffffff',
  greenPale: '#F0FDF4',
  background: '#F8FAF9',
  disabledBackground: '#F3F4F6',
  // Bordes y separadores.
  greenBorder: '#D3E6DC',
  greenBorderStrong: '#168A54',
  greenBorderSoft: '#DEEBE3',
  welcomeBorder: '#edefede8',
  greenPaleBorder: '#BBF7D0',
  gray100: '#F0F0F0',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  disabledBorder: '#E5E7EB',

  // Marca y estados.
  green: '#0f613b', //boton iniciar sesion
  greenBright: '#218757eb',
  mint: '#A7F3D0',
  blue: '#0369A1',
  red: '#DC2626',

  // Sombras.
  black: '#989595',
} as const;

const INPUT_SURFACE_STYLE = {
  backgroundColor: AUTH_COLORS.white,
  borderWidth: 1.5,
  borderColor: AUTH_COLORS.gray200,
  borderRadius: 12,
} as const;

const INPUT_TEXT_STYLE = {
  paddingVertical: 12,
  fontSize: 15,
  color: AUTH_COLORS.charcoal,
} as const;

export const authStyles = StyleSheet.create({
  // Tarjetas y encabezados.
  card: {
    backgroundColor: AUTH_COLORS.white,
    borderRadius: 28,
    padding: 24,
    shadowColor: AUTH_COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: AUTH_COLORS.gray100,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AUTH_COLORS.greenSoft,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
    alignSelf: 'center',
  },
  welcomeBadgeText: {
    color: AUTH_COLORS.green,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: AUTH_COLORS.heading,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: AUTH_COLORS.gray500,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 40,
    lineHeight: 20,
  },

  // Campos de texto.
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: AUTH_COLORS.gray800,
    marginBottom: 6,
  },
  input: {
    ...INPUT_SURFACE_STYLE,
    ...INPUT_TEXT_STYLE,
    paddingHorizontal: 16,
  },
  inputDisabled: {
    backgroundColor: AUTH_COLORS.disabledBackground,
    borderColor: AUTH_COLORS.disabledBorder,
  },
  inputDisabledText: {
    color: AUTH_COLORS.gray600,
    fontWeight: '600',
  },
  passwordInputWrapper: {
    ...INPUT_SURFACE_STYLE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    ...INPUT_TEXT_STYLE,
  },
  eyeIconButton: {
    padding: 6,
  },

  // Requisitos de contraseña.
  requirementsBox: {
    backgroundColor: AUTH_COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: AUTH_COLORS.gray200,
  },
  requirementsTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: AUTH_COLORS.gray800,
    marginBottom: 8,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  reqText: {
    fontSize: 12,
    color: AUTH_COLORS.gray700,
    marginLeft: 6,
  },
  reqTextActive: {
    color: AUTH_COLORS.green,
    fontWeight: '600',
  },

  // Acciones de acceso.
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.gray300,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AUTH_COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: AUTH_COLORS.greenCheck,
    borderColor: AUTH_COLORS.greenCheck,
  },
  rememberText: {
    fontSize: 12,
    color: AUTH_COLORS.gray700,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: AUTH_COLORS.green,
    width: '40%',
    paddingVertical: 10,
    alignSelf: 'center',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 14,
    shadowColor: AUTH_COLORS.green,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 1,
  },
  submitButtonText: {
    color: AUTH_COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    backgroundColor: AUTH_COLORS.greenMuted,
    shadowOpacity: 0.05,
    elevation: 0,
  },

  // Enlaces de navegación.
  bottomLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 13.5,
    color: AUTH_COLORS.greenDark,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontSize: 13.5,
    color: AUTH_COLORS.gray700,
    fontWeight: '600',
  },
  modifyEmailLink: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modifyEmailText: {
    fontSize: 13,
    color: AUTH_COLORS.gray700,
    fontWeight: '600',
  },

  // Consentimiento y términos.
  termsAgreementBox: {
    backgroundColor: AUTH_COLORS.greenSubtle,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AUTH_COLORS.greenBorder,
  },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  termsCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AUTH_COLORS.green,
    backgroundColor: AUTH_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  termsTextContainer: {
    flex: 1,
  },
  termsAgreementText: {
    fontSize: 13,
    color: AUTH_COLORS.gray900,
    lineHeight: 18,
  },
  termsLinkText: {
    color: AUTH_COLORS.green,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: AUTH_COLORS.greenBorderSoft,
  },
  termsInfoButtonText: {
    fontSize: 12,
    color: AUTH_COLORS.green,
    fontWeight: '600',
  },

  // Verificación y recuperación de contraseña.
  codeInputWrapper: {
    backgroundColor: AUTH_COLORS.greenPale,
    borderWidth: 2,
    borderColor: AUTH_COLORS.greenBorderStrong,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeInput: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 12,
    color: AUTH_COLORS.green,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  codeHelperText: {
    fontSize: 12.5,
    color: AUTH_COLORS.gray600,
    textAlign: 'center',
    marginBottom: 18,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  resendPromptText: {
    fontSize: 13,
    color: AUTH_COLORS.gray600,
  },
  resendLinkText: {
    fontSize: 13,
    color: AUTH_COLORS.green,
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginLeft: 4,
  },

  // Correo seleccionado durante el acceso.
  emailChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AUTH_COLORS.greenPale,
    borderWidth: 1,
    borderColor: AUTH_COLORS.greenPaleBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  emailChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  emailChipText: {
    fontSize: 14,
    color: AUTH_COLORS.green,
    fontWeight: '600',
    marginLeft: 8,
  },
  emailChipChangeText: {
    fontSize: 12.5,
    color: AUTH_COLORS.green,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
