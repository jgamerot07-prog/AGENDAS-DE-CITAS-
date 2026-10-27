import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/auth';

export default function AdminLayout() {
  const { admin, logout } = useAuth();

  return (
    <section className="container section">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Panel del negocio</p>
          <h1>Hola, {admin.name}</h1>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
      <nav className="tabs">
        <NavLink to="/admin" end>
          Agenda
        </NavLink>
        <NavLink to="/admin/servicios">Servicios</NavLink>
        <NavLink to="/admin/horario">Horario</NavLink>
      </nav>
      <Outlet />
    </section>
  );
}
