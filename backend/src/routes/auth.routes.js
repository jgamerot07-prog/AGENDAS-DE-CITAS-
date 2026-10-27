import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

// Frena ataques de fuerza bruta: máximo 10 intentos de login cada 15 minutos por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: () => config.env === 'test',
  message: { error: { message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' } },
});

// Hash de relleno para comparar aunque el correo no exista
const DUMMY_HASH = bcrypt.hashSync('contraseña-de-relleno', 10);

const loginSchema = z.object({
  email: z.email('Correo inválido').transform((email) => email.toLowerCase()),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.validated.body;
  const { rows: [admin] } = await query('SELECT * FROM admins WHERE email = $1', [email]);

  // Se compara siempre para no revelar si el correo existe por el tiempo de respuesta
  const valid = await bcrypt.compare(password, admin?.password_hash ?? DUMMY_HASH);
  if (!admin || !valid) {
    throw new AppError(401, 'Correo o contraseña incorrectos');
  }

  res.json({
    token: signToken(admin),
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows: [admin] } = await query('SELECT id, name, email FROM admins WHERE id = $1', [req.admin.id]);
  if (!admin) throw new AppError(401, 'La sesión no es válida');
  res.json({ admin });
});

export default router;
