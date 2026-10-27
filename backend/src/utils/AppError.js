/** Error controlado que se traduce en una respuesta HTTP con su código y mensaje. */
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
