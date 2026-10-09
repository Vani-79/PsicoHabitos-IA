/**
 * Utilidades puras para manipulación y formateo de fechas,
 * compatibles con los tipos DATE y DATETIME de bases de datos MySQL.
 */

/**
 * Formatea una fecha al formato estándar de MySQL 'YYYY-MM-DD' (tipo DATE).
 * @param date Objeto Date a formatear (por defecto la fecha y hora actual).
 */
export function formatToMySqlDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha al formato estándar de MySQL 'YYYY-MM-DD HH:MM:SS' (tipo DATETIME).
 * @param date Objeto Date a formatear (por defecto la fecha y hora actual).
 */
export function formatToMySqlDateTime(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function parseDateParts(clean: string): Date | null {
  const parts = clean.split(/[-/]/);
  if (parts.length !== 3) {
    return null;
  }

  const numbers = parts.map(Number);
  if (numbers.some(Number.isNaN)) {
    return null;
  }

  const [p1, p2, p3] = numbers;
  if (parts[0].length === 4) {
    // YYYY-MM-DD o YYYY/MM/DD
    return new Date(p1, p2 - 1, p3);
  }

  if (parts[2].length === 4) {
    // DD-MM-YYYY o DD/MM/YYYY
    return new Date(p3, p2 - 1, p1);
  }

  return null;
}

/**
 * Normaliza un string 'YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY' o un Date a un objeto Date local
 * para evitar desfases horarios por conversión UTC.
 */
export function parseLocalDate(dateInput: Date | string): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }

  const clean = dateInput.split('T')[0].split(' ')[0].trim();
  const parsed = parseDateParts(clean);
  if (parsed) {
    return parsed;
  }

  return new Date(dateInput);
}

/**
 * Comprueba si una fecha es futura respecto al momento actual.
 */
export function isFutureDate(dateInput: Date | string): boolean {
  const date = parseLocalDate(dateInput);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return date.getTime() > endOfToday.getTime();
}

/**
 * Comprueba si dateA es cronológicamente anterior a dateB.
 */
export function isDateBefore(dateAInput: Date | string, dateBInput: Date | string): boolean {
  const dateA = parseLocalDate(dateAInput);
  const dateB = parseLocalDate(dateBInput);
  return dateA.getTime() < dateB.getTime();
}

function tryFormatStringDate(clean: string): string | null {
  const isHyphen = clean.includes('-');
  const parts = isHyphen ? clean.split('-') : clean.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const [p1, p2, p3] = parts;
  if (p1.length === 4) {
    // YYYY-MM-DD o YYYY/MM/DD -> DD/MM/YYYY
    return `${p3.padStart(2, '0')}/${p2.padStart(2, '0')}/${p1}`;
  }
  if (p3.length === 4) {
    // DD-MM-YYYY o DD/MM/YYYY -> DD/MM/YYYY
    return `${p1.padStart(2, '0')}/${p2.padStart(2, '0')}/${p3}`;
  }
  return isHyphen ? null : clean;
}

/**
 * Formatea una fecha al formato estándar 'DD/MM/YYYY' (día-mes-año).
 * Acepta string 'YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD HH:MM:SS', ISO string o Date.
 * Retorna la fecha en formato día-mes-año (ej: '24/09/2026').
 */
export function formatToChileanDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const clean = dateInput.split('T')[0].split(' ')[0].trim();
    const formatted = tryFormatStringDate(clean);
    if (formatted) return formatted;
  }

  const date = parseLocalDate(dateInput);
  if (Number.isNaN(date.getTime())) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
