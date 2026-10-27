-- Necesaria para combinar rangos de tiempo e igualdad en la restricción EXCLUDE
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE services (
  id               SERIAL PRIMARY KEY,
  name             TEXT        NOT NULL,
  description      TEXT,
  duration_minutes INTEGER     NOT NULL CHECK (duration_minutes BETWEEN 10 AND 240),
  price            INTEGER     NOT NULL CHECK (price >= 0), -- en pesos colombianos
  active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Horario de atención: 0 = domingo ... 6 = sábado. Un día sin fila está cerrado.
CREATE TABLE business_hours (
  weekday    SMALLINT PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  open_time  TIME NOT NULL,
  close_time TIME NOT NULL,
  CHECK (close_time > open_time)
);

CREATE TYPE appointment_status AS ENUM ('pendiente', 'confirmada', 'completada', 'cancelada');

CREATE TABLE appointments (
  id             SERIAL PRIMARY KEY,
  service_id     INTEGER            NOT NULL REFERENCES services (id),
  customer_name  TEXT               NOT NULL,
  customer_phone TEXT               NOT NULL,
  customer_email TEXT,
  notes          TEXT,
  starts_at      TIMESTAMPTZ        NOT NULL,
  ends_at        TIMESTAMPTZ        NOT NULL,
  status         appointment_status NOT NULL DEFAULT 'pendiente',
  created_at     TIMESTAMPTZ        NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  -- La base de datos garantiza que dos citas activas nunca se crucen,
  -- incluso si dos clientes reservan el mismo horario al mismo tiempo.
  CONSTRAINT appointments_no_overlap
    EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&)
    WHERE (status <> 'cancelada')
);

CREATE INDEX appointments_starts_at_idx ON appointments (starts_at);
