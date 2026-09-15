import { Dimensions } from 'react-native';

/**
 * Dimensiones actuales de la ventana
 */
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Dimensiones base de referencia de diseño.
 * Basado en un teléfono estándar moderno (iPhone 11/13/14: 375 x 812).
 */
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Escala horizontal.
 * Úsalo para: anchos fijos, padding horizontal, márgenes horizontales, gap horizontal.
 *
 * @example
 * width: scale(120)
 * paddingHorizontal: scale(16)
 */
export const scale = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Escala vertical.
 * Úsalo para: alturas fijas, padding vertical, márgenes verticales, espaciadores.
 *
 * @example
 * height: verticalScale(50)
 * marginBottom: verticalScale(20)
 */
export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Escala moderada.
 * Úsalo para: fontSize, borderRadius, tamaños de iconos.
 * El `factor` (0.5 por defecto) amortigua la escala para que los textos
 * no queden ni gigantes en tablets ni diminutos en pantallas compactas.
 *
 * @example
 * fontSize: moderateScale(16)
 * borderRadius: moderateScale(12)
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Escala vertical moderada.
 * Úsalo para espaciados verticales sutiles.
 */
export const moderateVerticalScale = (size: number, factor: number = 0.5): number => {
  return size + (verticalScale(size) - size) * factor;
};

/**
 * Porcentaje del ancho de pantalla (0 a 100).
 *
 * @example
 * width: widthPercentage(90) // 90% del ancho
 */
export const widthPercentage = (percentage: number): number => {
  return (percentage * SCREEN_WIDTH) / 100;
};

/**
 * Porcentaje del alto de pantalla (0 a 100).
 *
 * @example
 * height: heightPercentage(25) // 25% del alto
 */
export const heightPercentage = (percentage: number): number => {
  return (percentage * SCREEN_HEIGHT) / 100;
};

// Aliases breves comunes para agilidad al escribir estilos:
export const s = scale;
export const vs = verticalScale;
export const ms = moderateScale;
export const mvs = moderateVerticalScale;
export const wp = widthPercentage;
export const hp = heightPercentage;

/**
 * Constantes y flags útiles
 */
export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;
export const isSmallDevice = SCREEN_WIDTH < 375;
