import { createApp } from './app.js';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { pool } from './db/pool.js';
import { seed } from './db/seed.js';

// En servicios como Render se activa RUN_MIGRATIONS=true para preparar la base al arrancar
if (config.runMigrations) {
  await migrate();
  await seed();
}

const server = createApp().listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
