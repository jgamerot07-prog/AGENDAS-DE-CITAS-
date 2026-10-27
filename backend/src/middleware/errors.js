import { AppError } from '../utils/AppError.js';

// Códigos de error de PostgreSQL que tienen una respuesta clara para el cliente
const pgErrors = {
  '23P01': [409, 'Ese horario ya fue reservado. Elige otro, por favor.'],
  '23503': [400, 'El registro relacionado no existe'],
  '23505': [409, 'Ya existe un registro con esos datos'],
};

export function notFound(req, _res, next) {
  next(new AppError(404, `No existe la ruta ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }
  if (pgErrors[err.code]) {
    const [status, message] = pgErrors[err.code];
    return res.status(status).json({ error: { message } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'El cuerpo de la solicitud no es un JSON válido' } });
  }
  console.error(err);
  return res.status(500).json({ error: { message: 'Error interno del servidor' } });
}
