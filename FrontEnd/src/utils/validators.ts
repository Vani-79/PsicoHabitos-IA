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
export const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

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
export function isValidAge(age: string | number, minAge = 16, maxAge = 96): boolean {
  const parsed = typeof age === 'number' ? age : Number.parseInt(age, 10);

  return (
    !Number.isNaN(parsed) &&
    parsed >= minAge &&
    parsed <= maxAge
  );
}

/**
 * Expresión regular que exige:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos una letra minúscula
 * - Al menos un número
 * - Al menos un carácter especial
 */
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

/**
 * Valida de forma detallada si una contraseña cumple con los requisitos de seguridad:
 * Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
 */
export function validatePasswordComplexity(password: string): { isValid: boolean; error?: string } {
  const clean = password.trim();
  if (clean.length < 8) {
    return { isValid: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (!/[A-Z]/.test(clean)) {
    return { isValid: false, error: 'La contraseña debe contener al menos una letra mayúscula.' };
  }
  if (!/[a-z]/.test(clean)) {
    return { isValid: false, error: 'La contraseña debe contener al menos una letra minúscula.' };
  }
  if (!/\d/.test(clean)) {
    return { isValid: false, error: 'La contraseña debe contener al menos un número.' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(clean)) {
    return { isValid: false, error: 'La contraseña debe contener al menos un carácter especial (ej. @, #, $, !).' };
  }
  return { isValid: true };
}

/**
 * Comprueba si una contraseña cumple con todos los requisitos de complejidad.
 */
export function isValidPassword(password: string): boolean {
  return validatePasswordComplexity(password).isValid;
}

interface NameValidationMessages {
  required: string;
  length: string;
  letters: string;
}

function validateNameField(
  value: string,
  fieldTitle: string,
  messages: NameValidationMessages,
  invalidTitle = `${fieldTitle} inválido`
): ValidationResult | null {
  if (!value) {
    return { isValid: false, errorTitle: `${fieldTitle} requerido`, errorMessage: messages.required };
  }
  if (!isValidStringLength(value, 2, 40)) {
    return { isValid: false, errorTitle: invalidTitle, errorMessage: messages.length };
  }
  if (!isLettersOnly(value)) {
    return { isValid: false, errorTitle: invalidTitle, errorMessage: messages.letters };
  }
  return null;
}

function validatePatientNames(form: PatientRegistrationForm): ValidationResult | null {
  const nombre = form.nombre.trim();
  const apellidoPaterno = form.apellidoPaterno.trim();
  const apellidoMaterno = form.apellidoMaterno.trim();

  return (
    validateNameField(nombre, 'Nombre', {
      required: 'Escribe el nombre del paciente.',
      length: 'El nombre debe tener entre 2 y 40 caracteres.',
      letters: 'El nombre no debe contener números ni símbolos.',
    }) ??
    validateNameField(
      apellidoPaterno,
      'Apellido Paterno',
      {
        required: 'Escribe el apellido paterno del paciente.',
        length: 'Debe tener entre 2 y 40 caracteres.',
        letters: 'No debe incluir números ni símbolos.',
      },
      'Apellido paterno inválido'
    ) ??
    validateNameField(
      apellidoMaterno,
      'Apellido Materno',
      {
        required: 'Escribe el apellido materno del paciente.',
        length: 'Debe tener entre 2 y 40 caracteres.',
        letters: 'No debe incluir números ni símbolos.',
      },
      'Apellido materno inválido'
    )
  );
}

function validatePatientDemographics(form: PatientRegistrationForm): ValidationResult | null {
  if (!form.fechaNacimiento) {
    return { isValid: false, errorTitle: 'Fecha requerida', errorMessage: 'Selecciona la fecha de nacimiento.' };
  }
  if (isFutureDate(form.fechaNacimiento)) {
    return { isValid: false, errorTitle: 'Fecha inválida', errorMessage: 'La fecha de nacimiento no puede ser futura.' };
  }
  if (!isValidAge(form.edad, 16)) {
    return { isValid: false, errorTitle: 'Edad inválida', errorMessage: 'El paciente debe tener al menos 16 años.' };
  }
  if (!form.genero) {
    return { isValid: false, errorTitle: 'Género requerido', errorMessage: 'Selecciona un género para continuar.' };
  }
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
  return null;
}

function validatePatientEmail(rawEmail: string): ValidationResult | null {
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    return { isValid: false, errorTitle: 'Email requerido', errorMessage: 'Escribe el correo del paciente.' };
  }
  if (!isValidEmail(email)) {
    return { isValid: false, errorTitle: 'Correo inválido', errorMessage: 'El correo debe tener formato válido.' };
  }
  return null;
}

/**
 * Valida de forma exhaustiva el formulario de registro de pacientes.
 * Devuelve un ValidationResult con el título y mensaje de error en caso de fallo.
 */
export function validatePatientForm(form: PatientRegistrationForm): ValidationResult {
  return (
    validatePatientNames(form) ??
    validatePatientDemographics(form) ??
    validatePatientEmail(form.email) ??
    { isValid: true }
  );
}
