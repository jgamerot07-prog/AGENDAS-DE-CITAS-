import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../utils/AppError.js';
import { toService } from '../utils/mappers.js';

const router = Router();

const serviceSchema = z.object({
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(80),
  description: z.string().trim().max(300).optional().nullable(),
  durationMinutes: z.number().int().min(10, 'Mínimo 10 minutos').max(240, 'Máximo 240 minutos'),
  price: z.number().int().min(0, 'El precio no puede ser negativo'),
  active: z.boolean().optional().default(true),
});

const idSchema = z.object({ id: z.coerce.number().int().positive() });

/** Servicios visibles para los clientes. */
router.get('/', async (_req, res) => {
  const { rows } = await query('SELECT * FROM services WHERE active ORDER BY name');
  res.json(rows.map(toService));
});

/** Todos los servicios, incluidos los inactivos (panel de administración). */
router.get('/all', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT * FROM services ORDER BY active DESC, name');
  res.json(rows.map(toService));
});

router.post('/', requireAuth, validate(serviceSchema), async (req, res) => {
  const { name, description, durationMinutes, price, active } = req.validated.body;
  const { rows: [row] } = await query(
    `INSERT INTO services (name, description, duration_minutes, price, active)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, description ?? null, durationMinutes, price, active],
  );
  res.status(201).json(toService(row));
});

router.put('/:id', requireAuth, validate(idSchema, 'params'), validate(serviceSchema), async (req, res) => {
  const { id } = req.validated.params;
  const { name, description, durationMinutes, price, active } = req.validated.body;
  const { rows: [row] } = await query(
    `UPDATE services
     SET name = $2, description = $3, duration_minutes = $4, price = $5, active = $6
     WHERE id = $1 RETURNING *`,
    [id, name, description ?? null, durationMinutes, price, active],
  );
  if (!row) throw new AppError(404, 'El servicio no existe');
  res.json(toService(row));
});

/** No se borra: se desactiva para conservar el historial de citas. */
router.delete('/:id', requireAuth, validate(idSchema, 'params'), async (req, res) => {
  const { rowCount } = await query('UPDATE services SET active = FALSE WHERE id = $1', [req.validated.params.id]);
  if (rowCount === 0) throw new AppError(404, 'El servicio no existe');
  res.status(204).end();
});

export default router;
