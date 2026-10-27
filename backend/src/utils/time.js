import { config } from '../config.js';

const MINUTE = 60_000;

/** '-05:00' -> -300 */
function offsetToMinutes(offset) {
  const sign = offset.startsWith('-') ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(':').map(Number);
  return sign * (hours * 60 + minutes);
}

/** '08:30' o '08:30:00' -> 510 */
export function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** 510 -> '08:30' */
export function minutesToTime(total) {
  const hours = String(Math.floor(total / 60)).padStart(2, '0');
  const minutes = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Fecha y hora locales del negocio ('2026-11-02', '08:30') -> instante UTC. */
export function localToDate(date, time, offset = config.utcOffset) {
  return new Date(`${date}T${time}:00${offset}`);
}

/** Instante UTC -> { date: 'YYYY-MM-DD', time: 'HH:MM' } en la hora local del negocio. */
export function dateToLocal(instant, offset = config.utcOffset) {
  const shifted = new Date(instant.getTime() + offsetToMinutes(offset) * MINUTE);
  const iso = shifted.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** Día de la semana de una fecha 'YYYY-MM-DD' (0 = domingo). */
export function weekdayOf(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Inicio y fin (exclusivo) de un día local, como instantes UTC. */
export function dayRange(date) {
  const start = localToDate(date, '00:00');
  return [start, new Date(start.getTime() + 24 * 60 * MINUTE)];
}

/** Suma minutos a un instante. */
export function addMinutes(instant, minutes) {
  return new Date(instant.getTime() + minutes * MINUTE);
}

/** Fecha local de hoy en el negocio. */
export function todayLocal() {
  return dateToLocal(new Date()).date;
}
