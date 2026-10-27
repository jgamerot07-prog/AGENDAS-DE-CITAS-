import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { pool } from './pool.js';

const defaultServices = [
  ['Corte clásico', 'Corte con máquina y tijera, lavado incluido.', 30, 20000],
  ['Corte + barba', 'Corte completo y perfilado de barba con toalla caliente.', 60, 32000],
  ['Arreglo de barba', 'Perfilado y afeitado con navaja.', 30, 15000],
  ['Corte infantil', 'Para niños menores de 12 años.', 30, 15000],
];

// Lunes a viernes de 8:00 a 18:00 y sábados de 8:00 a 14:00. Domingo cerrado.
const defaultHours = [
  [1, '08:00', '18:00'],
  [2, '08:00', '18:00'],
  [3, '08:00', '18:00'],
  [4, '08:00', '18:00'],
  [5, '08:00', '18:00'],
  [6, '08:00', '14:00'],
];

/** Carga datos iniciales. Es idempotente: solo inserta lo que falta. */
export async function seed({ silent = false } = {}) {
  const { email, name, password } = config.admin;
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [name, email.toLowerCase(), passwordHash],
  );

  const { rows: [{ count: services }] } = await pool.query('SELECT count(*)::int AS count FROM services');
  if (services === 0) {
    for (const service of defaultServices) {
      await pool.query(
        'INSERT INTO services (name, description, duration_minutes, price) VALUES ($1, $2, $3, $4)',
        service,
      );
    }
  }

  const { rows: [{ count: hours }] } = await pool.query('SELECT count(*)::int AS count FROM business_hours');
  if (hours === 0) {
    for (const day of defaultHours) {
      await pool.query('INSERT INTO business_hours (weekday, open_time, close_time) VALUES ($1, $2, $3)', day);
    }
  }

  if (!silent) console.log(`✔ Datos iniciales cargados (admin: ${email})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
