import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import Alert from '../components/Alert';
import Loader from '../components/Loader';
import ServiceCard from '../components/ServiceCard';
import {
  addDays,
  dateParts,
  formatDuration,
  formatLongDate,
  formatPrice,
  formatTime,
  todayInColombia,
} from '../utils/format';

const DAYS_TO_SHOW = 14;
const STEPS = ['Servicio', 'Fecha y hora', 'Tus datos'];
const emptyForm = { customerName: '', customerPhone: '', customerEmail: '', notes: '' };

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState([]);
  const [service, setService] = useState(null);
  const [date, setDate] = useState(todayInColombia());
  const [availability, setAvailability] = useState({ key: null, slots: [] });
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState({ services: true, submit: false });
  const [error, setError] = useState('');

  const days = useMemo(() => {
    const today = todayInColombia();
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(today, i));
  }, []);

  // Carga los servicios y, si llega ?servicio=ID desde la portada, lo deja elegido
  useEffect(() => {
    api
      .getServices()
      .then((data) => {
        setServices(data);
        const preselected = data.find((s) => String(s.id) === searchParams.get('servicio'));
        if (preselected) {
          setService(preselected);
          setStep(1);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading((l) => ({ ...l, services: false })));
  }, [searchParams]);

  // Cada vez que cambia el servicio o el día, se consultan los horarios libres
  const availabilityKey = service ? `${service.id}|${date}` : null;
  const loadingSlots = availability.key !== availabilityKey;
  const slots = availability.slots;

  useEffect(() => {
    if (!availabilityKey) return;
    let cancelled = false;
    api
      .getAvailability(date, service.id)
      .then((data) => !cancelled && setAvailability({ key: availabilityKey, slots: data.slots }))
      .catch((err) => {
        if (cancelled) return;
        setAvailability({ key: availabilityKey, slots: [] });
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [availabilityKey, date, service]);

  const chooseDate = (d) => {
    setDate(d);
    setSlot(null);
  };

  const chooseService = (selected) => {
    setService(selected);
    setSlot(null);
    setError('');
    setStep(1);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading((l) => ({ ...l, submit: true }));
    try {
      const appointment = await api.createAppointment({
        serviceId: service.id,
        startsAt: slot.startsAt,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail || null,
        notes: form.notes || null,
      });
      setConfirmation(appointment);
    } catch (err) {
      if (err.details) {
        setFieldErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      }
      // Si alguien tomó el horario mientras el cliente llenaba el formulario, se vuelve al paso 2
      if (err.status === 409) {
        setStep(1);
        setAvailability((a) => ({ ...a, slots: a.slots.filter((s) => s.startsAt !== slot.startsAt) }));
        setSlot(null);
      }
      setError(err.message);
    } finally {
      setLoading((l) => ({ ...l, submit: false }));
    }
  };

  if (confirmation) {
    return (
      <section className="container section narrow">
        <div className="card confirmation">
          <div className="confirmation-icon" aria-hidden="true">✓</div>
          <h1>¡Cita reservada!</h1>
          <p className="muted">Te esperamos. Si necesitas cambiarla, comunícate con el negocio.</p>
          <dl className="summary-list">
            <div>
              <dt>Servicio</dt>
              <dd>{confirmation.service.name}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd className="capitalize">{formatLongDate(date)}</dd>
            </div>
            <div>
              <dt>Hora</dt>
              <dd>{formatTime(confirmation.startsAt)}</dd>
            </div>
            <div>
              <dt>A nombre de</dt>
              <dd>{confirmation.customerName}</dd>
            </div>
            <div>
              <dt>Valor</dt>
              <dd>{formatPrice(confirmation.service.price)}</dd>
            </div>
          </dl>
          <Link to="/" className="btn btn-primary">
            Volver al inicio
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container section">
      <h1>Reserva tu cita</h1>

      <ol className="stepper">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'is-active' : i < step ? 'is-done' : ''}>
            <span className="step-number">{i < step ? '✓' : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <Alert>{error}</Alert>

      {step === 0 &&
        (loading.services ? (
          <Loader />
        ) : (
          <div className="service-grid">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} selected={service?.id === s.id} onSelect={chooseService} action="Elegir" />
            ))}
          </div>
        ))}

      {step === 1 && service && (
        <div className="booking-layout">
          <div>
            <h2>Elige el día</h2>
            <div className="day-picker">
              {days.map((d) => {
                const parts = dateParts(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={`day-chip ${d === date ? 'is-selected' : ''}`}
                    onClick={() => chooseDate(d)}
                    aria-pressed={d === date}
                  >
                    <span>{parts.weekday}</span>
                    <strong>{parts.day}</strong>
                    <span>{parts.month}</span>
                  </button>
                );
              })}
            </div>

            <h2>
              Horarios disponibles <span className="muted capitalize">· {formatLongDate(date)}</span>
            </h2>
            {loadingSlots ? (
              <Loader text="Buscando horarios..." />
            ) : slots.length === 0 ? (
              <p className="empty">No hay horarios disponibles este día. Prueba con otra fecha.</p>
            ) : (
              <div className="slot-grid">
                {slots.map((s) => (
                  <button
                    key={s.startsAt}
                    type="button"
                    className={`slot ${slot?.startsAt === s.startsAt ? 'is-selected' : ''}`}
                    onClick={() => setSlot(s)}
                    aria-pressed={slot?.startsAt === s.startsAt}
                  >
                    {formatTime(s.startsAt)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <BookingSummary service={service} date={date} slot={slot}>
            <button type="button" className="btn btn-outline" onClick={() => setStep(0)}>
              Cambiar servicio
            </button>
            <button type="button" className="btn btn-primary" disabled={!slot} onClick={() => setStep(2)}>
              Continuar
            </button>
          </BookingSummary>
        </div>
      )}

      {step === 2 && slot && (
        <div className="booking-layout">
          <form className="card form" onSubmit={handleSubmit} noValidate>
            <h2>Tus datos</h2>
            <Field label="Nombre completo" name="customerName" value={form.customerName} onChange={handleChange} error={fieldErrors.customerName} required autoComplete="name" />
            <Field label="Celular" name="customerPhone" type="tel" value={form.customerPhone} onChange={handleChange} error={fieldErrors.customerPhone} required autoComplete="tel" placeholder="300 123 4567" />
            <Field label="Correo (opcional)" name="customerEmail" type="email" value={form.customerEmail} onChange={handleChange} error={fieldErrors.customerEmail} autoComplete="email" />
            <Field label="Notas (opcional)" name="notes" as="textarea" value={form.notes} onChange={handleChange} error={fieldErrors.notes} placeholder="Ej.: corte bajo a los lados" />
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                Atrás
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading.submit}>
                {loading.submit ? 'Reservando...' : 'Confirmar reserva'}
              </button>
            </div>
          </form>
          <BookingSummary service={service} date={date} slot={slot} />
        </div>
      )}
    </section>
  );
}

function BookingSummary({ service, date, slot, children }) {
  return (
    <aside className="card booking-summary">
      <h3>Resumen</h3>
      <dl className="summary-list">
        <div>
          <dt>Servicio</dt>
          <dd>{service.name}</dd>
        </div>
        <div>
          <dt>Duración</dt>
          <dd>{formatDuration(service.durationMinutes)}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd className="capitalize">{formatLongDate(date)}</dd>
        </div>
        <div>
          <dt>Hora</dt>
          <dd>{slot ? formatTime(slot.startsAt) : '—'}</dd>
        </div>
        <div className="summary-total">
          <dt>Total</dt>
          <dd>{formatPrice(service.price)}</dd>
        </div>
      </dl>
      {children && <div className="summary-actions">{children}</div>}
    </aside>
  );
}

function Field({ label, name, error, as = 'input', ...props }) {
  const Tag = as;
  return (
    <label className="field">
      <span>{label}</span>
      <Tag name={name} aria-invalid={Boolean(error)} {...props} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
