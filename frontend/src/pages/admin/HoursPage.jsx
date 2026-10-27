import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';
import { WEEKDAYS } from '../../utils/format';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function HoursPage() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .getBusinessHours()
      .then((hours) =>
        setDays(
          ORDER.map((weekday) => {
            const day = hours.find((h) => h.weekday === weekday);
            return { weekday, open: Boolean(day), openTime: day?.openTime ?? '08:00', closeTime: day?.closeTime ?? '18:00' };
          }),
        ),
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (weekday, changes) => {
    setDays(days.map((d) => (d.weekday === weekday ? { ...d, ...changes } : d)));
    setMessage('');
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.updateBusinessHours(
        days.filter((d) => d.open).map(({ weekday, openTime, closeTime }) => ({ weekday, openTime, closeTime })),
      );
      setMessage('Horario guardado');
    } catch (err) {
      setError(err.details?.map((d) => d.message).join('. ') ?? err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <form className="card form hours-form" onSubmit={save}>
      <h2>Horario de atención</h2>
      <p className="muted">Los clientes solo podrán reservar dentro de este horario.</p>
      <Alert>{error}</Alert>
      <Alert type="success">{message}</Alert>
      {days.map((d) => (
        <div key={d.weekday} className="hours-row">
          <label className="checkbox">
            <input type="checkbox" checked={d.open} onChange={(e) => update(d.weekday, { open: e.target.checked })} />
            {WEEKDAYS[d.weekday]}
          </label>
          {d.open ? (
            <div className="hours-inputs">
              <input type="time" value={d.openTime} onChange={(e) => update(d.weekday, { openTime: e.target.value })} aria-label={`Apertura ${WEEKDAYS[d.weekday]}`} />
              <span>a</span>
              <input type="time" value={d.closeTime} onChange={(e) => update(d.weekday, { closeTime: e.target.value })} aria-label={`Cierre ${WEEKDAYS[d.weekday]}`} />
            </div>
          ) : (
            <span className="muted">Cerrado</span>
          )}
        </div>
      ))}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar horario'}
      </button>
    </form>
  );
}
