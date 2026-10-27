const isProduction = process.env.NODE_ENV === 'production';

function env(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(env('PORT', 4000)),
  databaseUrl: env('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/agenda'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  // En producción el secreto es obligatorio; en desarrollo se usa uno de ejemplo
  jwtSecret: env('JWT_SECRET', isProduction ? undefined : 'secreto-de-desarrollo'),
  jwtExpiresIn: env('JWT_EXPIRES_IN', '8h'),
  corsOrigins: env('CORS_ORIGIN', 'http://localhost:5173').split(',').map((o) => o.trim()),
  // El negocio opera en hora de Colombia (UTC-5, sin horario de verano)
  utcOffset: env('BUSINESS_UTC_OFFSET', '-05:00'),
  slotMinutes: Number(env('SLOT_MINUTES', 30)),
  maxDaysAhead: Number(env('MAX_DAYS_AHEAD', 60)),
  runMigrations: process.env.RUN_MIGRATIONS === 'true',
  admin: {
    name: env('ADMIN_NAME', 'Administrador'),
    email: env('ADMIN_EMAIL', 'admin@agendapro.com'),
    password: env('ADMIN_PASSWORD', 'Admin123*'),
  },
};
