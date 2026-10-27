import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/agenda_test',
      JWT_SECRET: 'secreto-de-pruebas',
    },
    // Las pruebas comparten una base de datos real, así que corren una tras otra
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
