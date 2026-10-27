import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { loginAsAdmin, MONDAY, nextWeekday, resetDatabase, SATURDAY, SUNDAY } from './helpers.js';

const app = createApp();
const monday = nextWeekday(MONDAY);

const booking = (overrides = {}) => ({
  serviceId: 1, // Corte clásico (30 min) según el orden del seed
  startsAt: `${monday}T09:00:00-05:00`,
  customerName: 'Laura Martínez',
  customerPhone: '300 123 4567',
  customerEmail: 'laura@example.com',
  ...overrides,
});

let token;

beforeAll(async () => {
  await resetDatabase();
  token = await loginAsAdmin(app);
});

beforeEach(async () => {
  await pool.query('TRUNCATE appointments RESTART IDENTITY');
});

afterAll(async () => {
  await pool.end();
});

describe('Salud y rutas', () => {
  it('responde ok cuando la base de datos está disponible', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('devuelve 404 en una ruta que no existe', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('Autenticación', () => {
  it('rechaza una contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@agendapro.com', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('entrega un token con credenciales correctas', () => {
    expect(token).toEqual(expect.any(String));
  });

  it('protege las rutas del panel', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
  });
});

describe('Servicios', () => {
  it('lista los servicios activos', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('durationMinutes');
  });

  it('valida los datos al crear un servicio', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', durationMinutes: 5, price: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['name', 'durationMinutes', 'price']),
    );
  });

  it('crea, edita y desactiva un servicio', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const created = await request(app)
      .post('/api/services')
      .set(auth)
      .send({ name: 'Tinte', durationMinutes: 90, price: 60000 });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .put(`/api/services/${created.body.id}`)
      .set(auth)
      .send({ name: 'Tinte completo', durationMinutes: 90, price: 65000 });
    expect(updated.body.name).toBe('Tinte completo');

    await request(app).delete(`/api/services/${created.body.id}`).set(auth).expect(204);
    const publicList = await request(app).get('/api/services');
    expect(publicList.body.find((s) => s.id === created.body.id)).toBeUndefined();
  });
});

describe('Disponibilidad', () => {
  it('genera los horarios de un lunes en bloques de 30 minutos', async () => {
    const res = await request(app).get(`/api/availability?date=${monday}&serviceId=1`);
    expect(res.status).toBe(200);
    // De 08:00 a 18:00 con un servicio de 30 minutos caben 20 bloques
    expect(res.body.slots).toHaveLength(20);
    expect(res.body.slots[0].time).toBe('08:00');
    expect(res.body.slots.at(-1).time).toBe('17:30');
  });

  it('no ofrece horarios el domingo', async () => {
    const res = await request(app).get(`/api/availability?date=${nextWeekday(SUNDAY)}&serviceId=1`);
    expect(res.body.slots).toEqual([]);
  });

  it('respeta el cierre temprano del sábado', async () => {
    const res = await request(app).get(`/api/availability?date=${nextWeekday(SATURDAY)}&serviceId=2`);
    // Servicio de 60 minutos: el último inicio posible antes de las 14:00 es 13:00
    expect(res.body.slots.at(-1).time).toBe('13:00');
  });

  it('quita los horarios que se cruzan con una cita existente', async () => {
    await request(app).post('/api/appointments').send(booking()).expect(201);

    // Un servicio de 60 minutos no cabe a las 08:30 ni a las 09:00 porque choca con la cita de 09:00
    const res = await request(app).get(`/api/availability?date=${monday}&serviceId=2`);
    const times = res.body.slots.map((s) => s.time);
    expect(times).toContain('08:00');
    expect(times).not.toContain('08:30');
    expect(times).not.toContain('09:00');
    expect(times).toContain('09:30');
  });

  it('valida el formato de la fecha', async () => {
    const res = await request(app).get('/api/availability?date=02-11-2026&serviceId=1');
    expect(res.status).toBe(400);
  });
});

describe('Reservas', () => {
  it('crea una cita pendiente', async () => {
    const res = await request(app).post('/api/appointments').send(booking());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pendiente');
    expect(res.body.service.name).toBe('Corte clásico');
    expect(new Date(res.body.endsAt) - new Date(res.body.startsAt)).toBe(30 * 60_000);
  });

  it('impide reservar dos veces el mismo horario', async () => {
    await request(app).post('/api/appointments').send(booking()).expect(201);
    const res = await request(app).post('/api/appointments').send(booking({ customerName: 'Otro Cliente' }));
    expect(res.status).toBe(409);
  });

  it('la base de datos impide el cruce aunque lleguen dos reservas al mismo tiempo', async () => {
    const results = await Promise.all([
      request(app).post('/api/appointments').send(booking()),
      request(app).post('/api/appointments').send(booking({ customerName: 'Cliente Simultáneo' })),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('rechaza horas en el pasado, fuera de horario o fuera de la cuadrícula', async () => {
    const cases = [
      booking({ startsAt: '2020-01-06T09:00:00-05:00' }),
      booking({ startsAt: `${monday}T19:00:00-05:00` }),
      booking({ startsAt: `${monday}T09:10:00-05:00` }),
      booking({ startsAt: `${nextWeekday(SUNDAY)}T09:00:00-05:00` }),
    ];
    for (const body of cases) {
      const res = await request(app).post('/api/appointments').send(body);
      expect(res.status).toBe(400);
    }
  });

  it('valida los datos del cliente', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send(booking({ customerName: 'A', customerPhone: 'abc', customerEmail: 'no-es-correo' }));
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveLength(3);
  });
});

describe('Panel de administración', () => {
  it('lista la agenda del día y cambia el estado de una cita', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const { body: appointment } = await request(app).post('/api/appointments').send(booking());

    const list = await request(app).get(`/api/appointments?date=${monday}`).set(auth);
    expect(list.body).toHaveLength(1);

    const updated = await request(app)
      .patch(`/api/appointments/${appointment.id}/status`)
      .set(auth)
      .send({ status: 'confirmada' });
    expect(updated.body.status).toBe('confirmada');
  });

  it('al cancelar una cita el horario vuelve a quedar libre', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const { body: appointment } = await request(app).post('/api/appointments').send(booking());
    await request(app)
      .patch(`/api/appointments/${appointment.id}/status`)
      .set(auth)
      .send({ status: 'cancelada' })
      .expect(200);

    await request(app).post('/api/appointments').send(booking({ customerName: 'Nuevo Cliente' })).expect(201);
  });

  it('calcula el resumen del día', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/appointments').send(booking());
    await request(app).post('/api/appointments').send(booking({ serviceId: 2, startsAt: `${monday}T10:00:00-05:00` }));

    const res = await request(app).get(`/api/appointments/summary?date=${monday}`).set(auth);
    expect(res.body).toMatchObject({ total: 2, pending: 2, expectedRevenue: 52000 });
  });

  it('actualiza el horario de atención', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const res = await request(app)
      .put('/api/business-hours')
      .set(auth)
      .send({ hours: [{ weekday: MONDAY, openTime: '09:00', closeTime: '12:00' }] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ weekday: MONDAY, openTime: '09:00', closeTime: '12:00' }]);

    const slots = await request(app).get(`/api/availability?date=${monday}&serviceId=1`);
    expect(slots.body.slots).toHaveLength(6);

    // Se restaura el horario para no afectar otras pruebas
    await resetDatabase();
  });
});
