import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Alert from '../components/Alert';
import Loader from '../components/Loader';
import ServiceCard from '../components/ServiceCard';
import { BUSINESS_NAME } from '../config';
import { WEEKDAYS } from '../utils/format';

export default function HomePage() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getServices(), api.getBusinessHours()])
      .then(([servicesData, hoursData]) => {
        setServices(servicesData);
        setHours(hoursData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Lunes primero, domingo al final
  const week = [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
    weekday,
    hours: hours.find((h) => h.weekday === weekday),
  }));

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">Reserva en línea · Sin filas ni llamadas</p>
          <h1>
            Tu próximo corte en <span>{BUSINESS_NAME}</span>, a un clic
          </h1>
          <p className="hero-text">
            Elige el servicio, mira los horarios libres en tiempo real y aparta tu cita en menos de un minuto.
          </p>
          <Link to="/reservar" className="btn btn-primary btn-lg">
            Reservar ahora
          </Link>
        </div>
      </section>

      <section className="container section">
        <h2>Servicios</h2>
        <Alert>{error}</Alert>
        {loading ? (
          <Loader />
        ) : (
          <div className="service-grid">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                action="Reservar"
                onSelect={() => navigate(`/reservar?servicio=${service.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {!loading && hours.length > 0 && (
        <section className="container section">
          <h2>Horario de atención</h2>
          <ul className="hours-list card">
            {week.map(({ weekday, hours: day }) => (
              <li key={weekday}>
                <span>{WEEKDAYS[weekday]}</span>
                <span className={day ? '' : 'muted'}>{day ? `${day.openTime} – ${day.closeTime}` : 'Cerrado'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
