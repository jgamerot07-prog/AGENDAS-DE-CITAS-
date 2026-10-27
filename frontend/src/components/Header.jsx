import { Link, NavLink } from 'react-router-dom';
import { BUSINESS_NAME } from '../config';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">✂</span>
          {BUSINESS_NAME}
        </Link>
        <nav className="header-nav">
          <NavLink to="/admin" className="nav-link">
            Panel
          </NavLink>
          <Link to="/reservar" className="btn btn-primary btn-sm">
            Reservar cita
          </Link>
        </nav>
      </div>
    </header>
  );
}
