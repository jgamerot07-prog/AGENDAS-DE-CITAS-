import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import Alert from '../../components/Alert';
import Loader from '../../components/Loader';
import { formatDuration, formatPrice } from '../../utils/format';

const emptyForm = { name: '', description: '', durationMinutes: 30, price: 0, active: true };

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () =>
    api
      .getAllServices()
      .then(setServices)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const edit = (service) => {
    setEditingId(service.id);
    setForm({ ...service, description: service.description ?? '' });
    setMessage('');
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const data = {
      name: form.name,
      description: form.description || null,
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
      active: form.active,
    };
    try {
      if (editingId) {
        await api.updateService(editingId, data);
        setMessage('Servicio actualizado');
      } else {
        await api.createService(data);
        setMessage('Servicio creado');
      }
      reset();
      load();
    } catch (err) {
      setError(err.details?.map((d) => d.message).join('. ') ?? err.message);
    }
  };

  const toggleActive = async (service) => {
    try {
      await api.updateService(service.id, { ...service, active: !service.active });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-grid">
      <form className="card form" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Editar servicio' : 'Nuevo servicio'}</h2>
        <Alert>{error}</Alert>
        <Alert type="success">{message}</Alert>
        <label className="field">
          <span>Nombre</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="field">
          <span>Descripción</span>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Duración (min)</span>
            <input type="number" min="10" max="240" step="5" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} required />
          </label>
          <label className="field">
            <span>Precio (COP)</span>
            <input type="number" min="0" step="1000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </label>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Visible para los clientes
        </label>
        <div className="form-actions">
          {editingId && (
            <button type="button" className="btn btn-outline" onClick={reset}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </div>
      </form>

      <div>
        <h2>Servicios ({services.length})</h2>
        {loading ? (
          <Loader />
        ) : (
          <ul className="admin-list">
            {services.map((s) => (
              <li key={s.id} className={`card ${s.active ? '' : 'is-inactive'}`}>
                <div>
                  <strong>{s.name}</strong>
                  <p className="muted">
                    {formatDuration(s.durationMinutes)} · {formatPrice(s.price)}
                    {!s.active && ' · Oculto'}
                  </p>
                </div>
                <div className="row-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => edit(s)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn-link btn-sm" onClick={() => toggleActive(s)}>
                    {s.active ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
