/**
 * Funciones puras y reutilizables para validaciones de datos y reglas de negocio.
 */

import { PatientRegistrationForm } from '../types/patient';
import { isFutureDate, isDateBefore } from './date';

export interface ValidationResult {
  isValid: boolean;
  errorTitle?: string;
  errorMessage?: string;
}

/**
 * Expresión regular para validar correos electrónicos estándar.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Expresión regular para verificar cadenas que solo contengan letras (con tildes en español y 'ñ') y espacios.
 */
export const LETTERS_ONLY_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;

/**
 * Comprueba si una cadena contiene únicamente letras y espacios.
 */
export function isLettersOnly(text: string): boolean {
  return LETTERS_ONLY_REGEX.test(text);
}

/**
 * Comprueba si la longitud de una cadena (sin espacios al inicio o final) está dentro de los límites permitidos.
 */
export function isValidStringLength(text: string, min = 2, max = 40): boolean {
  const trimmed = text.trim();
  return trimmed.length >= min && trimmed.length <= max;
}

/**
 * Comprueba si un correo electrónico tiene un formato válido.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Comprueba si una edad numérica es válida y cumple con la edad mínima requerida.
 */
export function isValidAge(age: string | number, minAge = 16): boolean {
  const parsed = typeof age === 'number' ? age : parseInt(age, 10);
  return !isNaN(parsed) && parsed >= minAge;
}

/**
 * Valida de forma exhaustiva el formulario de registro de pacientes.
 * Devuelve un ValidationResult con el título y mensaje de error en caso de fallo.
 */
export function validatePatientForm(form: PatientRegistrationForm): ValidationResult {
  const nombre = form.nombre.trim();
  const apellidoPaterno = form.apellidoPaterno.trim();
  const apellidoMaterno = form.apellidoMaterno.trim();
  const email = form.email.trim().toLowerCase();

  // 1. Nombre
  if (!nombre) {
    return { isValid: false, errorTitle: 'Nombre requerido', errorMessage: 'Escribe el nombre del paciente.' };
  }
  if (!isValidStringLength(nombre, 2, 40)) {
    return { isValid: false, errorTitle: 'Nombre inválido', errorMessage: 'El nombre debe tener entre 2 y 40 caracteres.' };
  }
  if (!isLettersOnly(nombre)) {
    return { isValid: false, errorTitle: 'Nombre inválido', errorMessage: 'El nombre no debe contener números ni símbolos.' };
  }

  // 2. Apellido Paterno
  if (!apellidoPaterno) {
    return { isValid: false, errorTitle: 'Apellido Paterno requerido', errorMessage: 'Escribe el apellido paterno del paciente.' };
  }
  if (!isValidStringLength(apellidoPaterno, 2, 40)) {
    return { isValid: false, errorTitle: 'Apellido paterno inválido', errorMessage: 'Debe tener entre 2 y 40 caracteres.' };
  }
  if (!isLettersOnly(apellidoPaterno)) {
    return { isValid: false, errorTitle: 'Apellido paterno inválido', errorMessage: 'No debe incluir números ni símbolos.' };
  }

  // 3. Apellido Materno
  if (!apellidoMaterno) {
    return { isValid: false, errorTitle: 'Apellido Materno requerido', errorMessage: 'Escribe el apellido materno del paciente.' };
  }
  if (!isValidStringLength(apellidoMaterno, 2, 40)) {
    return { isValid: false, errorTitle: 'Apellido materno inválido', errorMessage: 'Debe tener entre 2 y 40 caracteres.' };
  }
  if (!isLettersOnly(apellidoMaterno)) {
    return { isValid: false, errorTitle: 'Apellido materno inválido', errorMessage: 'No debe incluir números ni símbolos.' };
  }

  // 4. Fecha de Nacimiento
  if (!form.fechaNacimiento) {
    return { isValid: false, errorTitle: 'Fecha requerida', errorMessage: 'Selecciona la fecha de nacimiento.' };
  }
  if (isFutureDate(form.fechaNacimiento)) {
    return { isValid: false, errorTitle: 'Fecha inválida', errorMessage: 'La fecha de nacimiento no puede ser futura.' };
  }

  // 5. Edad
  if (!isValidAge(form.edad, 16)) {
    return { isValid: false, errorTitle: 'Edad inválida', errorMessage: 'El paciente debe tener al menos 16 años.' };
  }

  // 6. Género
  if (!form.genero) {
    return { isValid: false, errorTitle: 'Género requerido', errorMessage: 'Selecciona un género para continuar.' };
  }

  // 7. Fecha de Primera Sesión
  if (!form.fechaPrimeraSesion) {
    return { isValid: false, errorTitle: 'Fecha requerida', errorMessage: 'Selecciona la fecha de la primera sesión.' };
  }
  if (isFutureDate(form.fechaPrimeraSesion)) {
    return { isValid: false, errorTitle: 'Fecha inválida', errorMessage: 'La fecha de la primera sesión no puede ser futura.' };
  }
  if (isDateBefore(form.fechaPrimeraSesion, form.fechaNacimiento)) {
    return {
      isValid: false,
      errorTitle: 'Fecha inválida',
      errorMessage: 'La primera sesión no puede ser anterior a la fecha de nacimiento.',
    };
  }

  // 8. Correo Electrónico
  if (!email) {
    return { isValid: false, errorTitle: 'Email requerido', errorMessage: 'Escribe el correo del paciente.' };
  }
  if (!isValidEmail(email)) {
    return { isValid: false, errorTitle: 'Correo inválido', errorMessage: 'El correo debe tener formato válido.' };
  }

  return { isValid: true };
}
