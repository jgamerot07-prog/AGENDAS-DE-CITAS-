import { config } from '../config.js';
import { query } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import {
  addMinutes,
  dateToLocal,
  dayRange,
  localToDate,
  minutesToTime,
  toMinutes,
  weekdayOf,
} from '../utils/time.js';

async function getHours(date) {
  const { rows } = await query(
    'SELECT open_time, close_time FROM business_hours WHERE weekday = $1',
    [weekdayOf(date)],
  );
  if (rows.length === 0) return null;
  return { open: toMinutes(rows[0].open_time), close: toMinutes(rows[0].close_time) };
}

/**
 * Horarios libres de un día para un servicio.
 * Recorre la jornada en bloques de `slotMinutes` y descarta los que ya pasaron
 * o se cruzan con una cita activa.
 */
export async function getAvailableSlots(date, service, now = new Date()) {
  const hours = await getHours(date);
  if (!hours) return [];

  const [dayStart, dayEnd] = dayRange(date);
  const { rows: busy } = await query(
    `SELECT starts_at, ends_at FROM appointments
     WHERE status <> 'cancelada' AND starts_at < $2 AND ends_at > $1`,
    [dayStart, dayEnd],
  );

  const slots = [];
  for (let m = hours.open; m + service.durationMinutes <= hours.close; m += config.slotMinutes) {
    const startsAt = localToDate(date, minutesToTime(m));
    const endsAt = addMinutes(startsAt, service.durationMinutes);
    if (startsAt <= now) continue;

    const overlaps = busy.some((b) => startsAt < b.ends_at && endsAt > b.starts_at);
    if (!overlaps) {
      slots.push({ time: minutesToTime(m), startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
    }
  }
  return slots;
}

/** Verifica que una cita empiece en un bloque válido y termine dentro del horario. */
export async function assertBookable(startsAt, durationMinutes, now = new Date()) {
  if (startsAt <= now) {
    throw new AppError(400, 'No puedes reservar en una fecha u hora que ya pasó');
  }

  const { date, time } = dateToLocal(startsAt);
  const maxDate = addMinutes(now, config.maxDaysAhead * 24 * 60);
  if (startsAt > maxDate) {
    throw new AppError(400, `Solo se puede reservar con hasta ${config.maxDaysAhead} días de anticipación`);
  }

  const hours = await getHours(date);
  if (!hours) {
    throw new AppError(400, 'El negocio no atiende ese día');
  }

  const start = toMinutes(time);
  const insideHours = start >= hours.open && start + durationMinutes <= hours.close;
  const onSlot = (start - hours.open) % config.slotMinutes === 0;
  if (!insideHours || !onSlot) {
    throw new AppError(400, 'La hora elegida está fuera del horario de atención');
  }
}
