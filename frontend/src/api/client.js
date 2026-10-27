const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api`;
const TOKEN_KEY = 'agenda_token';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStorage.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Si la sesión venció, se avisa a la app para que cierre sesión
    if (res.status === 401 && auth) window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError(res.status, data.error?.message ?? 'Ocurrió un error inesperado', data.error?.details);
  }
  return data;
}

export const api = {
  // Público
  getServices: () => request('/services'),
  getBusinessHours: () => request('/business-hours'),
  getAvailability: (date, serviceId) => request(`/availability?date=${date}&serviceId=${serviceId}`),
  createAppointment: (data) => request('/appointments', { method: 'POST', body: data }),

  // Administración
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me', { auth: true }),
  getAppointments: (date, status) =>
    request(`/appointments?date=${date}${status ? `&status=${status}` : ''}`, { auth: true }),
  getSummary: (date) => request(`/appointments/summary?date=${date}`, { auth: true }),
  updateAppointmentStatus: (id, status) =>
    request(`/appointments/${id}/status`, { method: 'PATCH', body: { status }, auth: true }),
  getAllServices: () => request('/services/all', { auth: true }),
  createService: (data) => request('/services', { method: 'POST', body: data, auth: true }),
  updateService: (id, data) => request(`/services/${id}`, { method: 'PUT', body: data, auth: true }),
  updateBusinessHours: (hours) => request('/business-hours', { method: 'PUT', body: { hours }, auth: true }),
};
