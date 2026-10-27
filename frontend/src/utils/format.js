// El negocio opera en hora de Colombia; todas las fechas se muestran en esa zona
export const TIME_ZONE = 'America/Bogota';

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** 20000 -> "$ 20.000" */
export const formatPrice = (value) => currency.format(value);

/** 90 -> "1 h 30 min" */
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Instante ISO -> "9:00 a. m." en hora de Colombia */
export const formatTime = (iso) =>
  new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE }).format(new Date(iso));

/** "2026-11-02" -> "lunes, 2 de noviembre" */
export const formatLongDate = (date) =>
  new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );

/** "2026-11-02" -> { weekday: "lun", day: "2", month: "nov" } */
export function dateParts(date) {
  const d = new Date(`${date}T00:00:00Z`);
  const part = (options) => new Intl.DateTimeFormat('es-CO', { ...options, timeZone: 'UTC' }).format(d).replace('.', '');
  return { weekday: part({ weekday: 'short' }), day: part({ day: 'numeric' }), month: part({ month: 'short' }) };
}

/** Fecha de hoy (AAAA-MM-DD) en Colombia. */
export const todayInColombia = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);

/** Suma días a una fecha AAAA-MM-DD. */
export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const STATUS_LABELS = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
};
