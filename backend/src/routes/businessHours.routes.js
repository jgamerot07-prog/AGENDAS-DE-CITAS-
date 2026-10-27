import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:MM');

const hoursSchema = z.object({
  hours: z
    .array(
      z
        .object({ weekday: z.number().int().min(0).max(6), openTime: time, closeTime: time })
        .refine((d) => d.closeTime > d.openTime, 'La hora de cierre debe ser posterior a la de apertura'),
    )
    .max(7)
    .refine((days) => new Set(days.map((d) => d.weekday)).size === days.length, 'Hay días repetidos'),
});

async function listHours() {
  const { rows } = await query('SELECT * FROM business_hours ORDER BY weekday');
  return rows.map((r) => ({
    weekday: r.weekday,
    openTime: r.open_time.slice(0, 5),
    closeTime: r.close_time.slice(0, 5),
  }));
}

router.get('/', async (_req, res) => {
  res.json(await listHours());
});

/** Reemplaza el horario completo. Los días que no se envían quedan cerrados. */
router.put('/', requireAuth, validate(hoursSchema), async (req, res) => {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM business_hours');
    for (const day of req.validated.body.hours) {
      await client.query(
        'INSERT INTO business_hours (weekday, open_time, close_time) VALUES ($1, $2, $3)',
        [day.weekday, day.openTime, day.closeTime],
      );
    }
  });
  res.json(await listHours());
});

export default router;
