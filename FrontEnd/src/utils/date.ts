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

/**
 * Normaliza un string 'YYYY-MM-DD' o un Date a un objeto Date local
 * para evitar desfases horarios por conversión UTC.
 */
export function parseLocalDate(dateInput: Date | string): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  const parts = dateInput.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month - 1, day);
    }
  }
  return new Date(dateInput);
}

/**
 * Comprueba si una fecha es futura respecto al momento actual.
 */
export function isFutureDate(dateInput: Date | string): boolean {
  const date = parseLocalDate(dateInput);
  const now = new Date();
  return date.getTime() > now.getTime();
}

/**
 * Comprueba si dateA es cronológicamente anterior a dateB.
 */
export function isDateBefore(dateAInput: Date | string, dateBInput: Date | string): boolean {
  const dateA = parseLocalDate(dateAInput);
  const dateB = parseLocalDate(dateBInput);
  return dateA.getTime() < dateB.getTime();
}
