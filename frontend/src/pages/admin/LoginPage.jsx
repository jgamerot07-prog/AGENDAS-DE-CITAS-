import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Alert from '../../components/Alert';
import { useAuth } from '../../context/auth';

export default function LoginPage() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (admin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container section narrow">
      <form className="card form" onSubmit={handleSubmit}>
        <h1>Panel del negocio</h1>
        <p className="muted">Ingresa para gestionar tu agenda.</p>
        <Alert>{error}</Alert>
        <label className="field">
          <span>Correo</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="username" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </section>
  );
}
