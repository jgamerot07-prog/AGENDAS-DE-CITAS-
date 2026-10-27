import { AppError } from '../utils/AppError.js';

/**
 * Valida req[source] con un esquema de Zod.
 * Los datos limpios quedan en req.validated[source].
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new AppError(400, 'Hay datos inválidos en la solicitud', details);
  }
  req.validated = { ...req.validated, [source]: result.data };
  next();
};
