// Convierten filas de la base de datos (snake_case) en objetos de la API (camelCase)

export const toService = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  durationMinutes: row.duration_minutes,
  price: row.price,
  active: row.active,
});

export const toAppointment = (row) => ({
  id: row.id,
  service: { id: row.service_id, name: row.service_name, price: row.service_price },
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  customerEmail: row.customer_email,
  notes: row.notes,
  startsAt: row.starts_at.toISOString(),
  endsAt: row.ends_at.toISOString(),
  status: row.status,
  createdAt: row.created_at.toISOString(),
});
