import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { assertBookable } from '../services/availability.js';
import { AppError } from '../utils/AppError.js';
import { toAppointment } from '../utils/mappers.js';
import { addMinutes, dayRange, todayLocal } from '../utils/time.js';

const router = Router();

const STATUSES = ['pendiente', 'confirmada', 'completada', 'cancelada'];

const SELECT_APPOINTMENTS = `
  SELECT a.*, s.name AS service_name, s.price AS service_price
  FROM appointments a
  JOIN services s ON s.id = a.service_id`;

const createSchema = z.object({
  serviceId: z.number().int().positive('Servicio inválido'),
  startsAt: z.iso.datetime({ offset: true, error: 'Fecha y hora inválidas' }),
  customerName: z.string().trim().min(3, 'Escribe tu nombre completo').max(100),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/, 'Escribe un teléfono válido'),
  customerEmail: z.email('Correo inválido').optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
});

const listSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD').optional(),
  status: z.enum(STATUSES).optional(),
});

const statusSchema = z.object({ status: z.enum(STATUSES, 'Estado inválido') });
const idSchema = z.object({ id: z.coerce.number().int().positive() });

/** Un cliente reserva una cita (ruta pública). */
router.post('/', validate(createSchema), async (req, res) => {
  const data = req.validated.body;
  const { rows: [service] } = await query('SELECT * FROM services WHERE id = $1 AND active', [data.serviceId]);
  if (!service) throw new AppError(404, 'El servicio no existe');

  const startsAt = new Date(data.startsAt);
  await assertBookable(startsAt, service.duration_minutes);
  const endsAt = addMinutes(startsAt, service.duration_minutes);

  // Si otro cliente tomó el horario un instante antes, la restricción EXCLUDE
  // de la base de datos lanza el error 23P01 y respondemos 409.
  const { rows: [{ id }] } = await query(
    `INSERT INTO appointments
       (service_id, customer_name, customer_phone, customer_email, notes, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [service.id, data.customerName, data.customerPhone, data.customerEmail ?? null, data.notes ?? null, startsAt, endsAt],
  );
  const { rows: [row] } = await query(`${SELECT_APPOINTMENTS} WHERE a.id = $1`, [id]);
  res.status(201).json(toAppointment(row));
});

/** Resumen del día para las tarjetas del panel. */
router.get('/summary', requireAuth, validate(listSchema, 'query'), async (req, res) => {
  const [from, to] = dayRange(req.validated.query.date ?? todayLocal());
  const { rows: [summary] } = await query(
    `SELECT
       count(*)::int                                              AS total,
       count(*) FILTER (WHERE a.status = 'pendiente')::int        AS pending,
       count(*) FILTER (WHERE a.status = 'confirmada')::int       AS confirmed,
       count(*) FILTER (WHERE a.status = 'completada')::int       AS completed,
       count(*) FILTER (WHERE a.status = 'cancelada')::int        AS cancelled,
       coalesce(sum(s.price) FILTER (WHERE a.status <> 'cancelada'), 0)::int AS expected_revenue
     FROM appointments a JOIN services s ON s.id = a.service_id
     WHERE a.starts_at >= $1 AND a.starts_at < $2`,
    [from, to],
  );
  res.json({
    total: summary.total,
    pending: summary.pending,
    confirmed: summary.confirmed,
    completed: summary.completed,
    cancelled: summary.cancelled,
    expectedRevenue: summary.expected_revenue,
  });
});

/** Agenda de un día (por defecto, hoy). */
router.get('/', requireAuth, validate(listSchema, 'query'), async (req, res) => {
  const { date, status } = req.validated.query;
  const [from, to] = dayRange(date ?? todayLocal());
  const params = [from, to];
  let sql = `${SELECT_APPOINTMENTS} WHERE a.starts_at >= $1 AND a.starts_at < $2`;
  if (status) {
    params.push(status);
    sql += ' AND a.status = $3';
  }
  const { rows } = await query(`${sql} ORDER BY a.starts_at`, params);
  res.json(rows.map(toAppointment));
});

router.patch(
  '/:id/status',
  requireAuth,
  validate(idSchema, 'params'),
  validate(statusSchema),
  async (req, res) => {
    const { rowCount } = await query('UPDATE appointments SET status = $2 WHERE id = $1', [
      req.validated.params.id,
      req.validated.body.status,
    ]);
    if (rowCount === 0) throw new AppError(404, 'La cita no existe');
    const { rows: [row] } = await query(`${SELECT_APPOINTMENTS} WHERE a.id = $1`, [req.validated.params.id]);
    res.json(toAppointment(row));
  },
);

export default router;
