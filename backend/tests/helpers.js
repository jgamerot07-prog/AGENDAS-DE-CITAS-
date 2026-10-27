import request from 'supertest';
import { config } from '../src/config.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import { seed } from '../src/db/seed.js';

/** Deja la base de pruebas limpia, con el esquema y los datos iniciales. */
export async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate({ silent: true });
  await seed({ silent: true });
}

/** Próxima fecha (AAAA-MM-DD) que cae en el día de la semana indicado, al menos a 2 días de hoy. */
export function nextWeekday(weekday) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  while (date.getUTCDay() !== weekday) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export async function loginAsAdmin(app) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: config.admin.email, password: config.admin.password });
  return res.body.token;
}

export const MONDAY = 1;
export const SATURDAY = 6;
export const SUNDAY = 0;
