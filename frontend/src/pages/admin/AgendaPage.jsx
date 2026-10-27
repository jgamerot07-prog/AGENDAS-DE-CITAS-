import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';
import { addDays, formatLongDate, formatPrice, formatTime, STATUS_LABELS, todayInColombia } from '../../utils/format';

// Acciones posibles según el estado actual de la cita
const ACTIONS = {
  pendiente: [
    ['confirmada', 'Confirmar'],
    ['cancelada', 'Cancelar'],
  ],
  confirmada: [
    ['completada', 'Completar'],
    ['cancelada', 'Cancelar'],
  ],
  completada: [],
  cancelada: [],
};

export default function AgendaPage() {
  const [date, setDate] = useState(todayInColombia());
  const [status, setStatus] = useState('');
  const [version, setVersion] = useState(0);
  const [data, setData] = useState({ key: null, appointments: [], summary: null, error: '' });
  const [actionError, setActionError] = useState('');

  // La llave cambia con la fecha, el filtro o una recarga; mientras no coincida, se está cargando
  const key = `${date}|${status}|${version}`;
  const loading = data.key !== key;

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getAppointments(date, status), api.getSummary(date)])
      .then(([appointments, summary]) => !cancelled && setData({ key, appointments, summary, error: '' }))
      .catch((err) => !cancelled && setData((d) => ({ ...d, key, error: err.message })));
    return () => {
      cancelled = true;
    };
  }, [key, date, status]);

  const changeStatus = async (id, newStatus) => {
    if (newStatus === 'cancelada' && !window.confirm('¿Seguro que quieres cancelar esta cita?')) return;
    setActionError('');
    try {
      await api.updateAppointmentStatus(id, newStatus);
      setVersion((v) => v + 1);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const { appointments, summary } = data;

  return (
    <>
      <div className="toolbar">
        <div className="date-nav">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
            ←
          </button>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">
            →
          </button>
          <button type="button" className="btn btn-link btn-sm" onClick={() => setDate(todayInColombia())}>
            Hoy
          </button>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <h2 className="capitalize">{formatLongDate(date)}</h2>

      {summary && (
        <div className="stats">
          <Stat label="Citas del día" value={summary.total - summary.cancelled} />
          <Stat label="Por confirmar" value={summary.pending} />
          <Stat label="Completadas" value={summary.completed} />
          <Stat label="Ingresos estimados" value={formatPrice(summary.expectedRevenue)} />
        </div>
      )}

      <Alert>{data.error || actionError}</Alert>

      {loading ? (
        <Loader />
      ) : appointments.length === 0 ? (
        <p className="empty">No hay citas para este día.</p>
      ) : (
        <ul className="appointment-list">
          {appointments.map((a) => (
            <li key={a.id} className={`card appointment ${a.status === 'cancelada' ? 'is-cancelled' : ''}`}>
              <div className="appointment-time">
                <strong>{formatTime(a.startsAt)}</strong>
                <span className="muted">{formatTime(a.endsAt)}</span>
              </div>
              <div className="appointment-info">
                <div className="appointment-title">
                  <strong>{a.customerName}</strong>
                  <StatusBadge status={a.status} />
                </div>
                <p>
                  {a.service.name} · {formatPrice(a.service.price)}
                </p>
                <p className="muted">
                  <a href={`tel:${a.customerPhone.replace(/\s/g, '')}`}>{a.customerPhone}</a>
                  {a.customerEmail && <> · {a.customerEmail}</>}
                </p>
                {a.notes && <p className="notes">“{a.notes}”</p>}
              </div>
              <div className="appointment-actions">
                {ACTIONS[a.status].map(([next, label]) => (
                  <button
                    key={next}
                    type="button"
                    className={`btn btn-sm ${next === 'cancelada' ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => changeStatus(a.id, next)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card stat">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
