import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { validate } from '../middleware/validate.js';
import { getAvailableSlots } from '../services/availability.js';
import { AppError } from '../utils/AppError.js';
import { toService } from '../utils/mappers.js';

const router = Router();

const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD'),
  serviceId: z.coerce.number().int().positive('Servicio inválido'),
});

router.get('/', validate(availabilitySchema, 'query'), async (req, res) => {
  const { date, serviceId } = req.validated.query;
  const { rows: [row] } = await query('SELECT * FROM services WHERE id = $1 AND active', [serviceId]);
  if (!row) throw new AppError(404, 'El servicio no existe');

  const service = toService(row);
  const slots = await getAvailableSlots(date, service);
  res.json({ date, service, slots });
});

export default router;
