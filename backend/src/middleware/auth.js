import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';

export function signToken(admin) {
  return jwt.sign({ sub: admin.id, name: admin.name }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/** Exige un token JWT válido en el encabezado Authorization: Bearer <token>. */
export function requireAuth(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Debes iniciar sesión');
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.admin = { id: payload.sub, name: payload.name };
  } catch {
    throw new AppError(401, 'La sesión expiró o no es válida');
  }
  next();
}
