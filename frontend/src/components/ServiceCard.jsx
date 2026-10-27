import { formatDuration, formatPrice } from '../utils/format';

export default function ServiceCard({ service, selected, onSelect, action }) {
  return (
    <article className={`service-card ${selected ? 'is-selected' : ''}`}>
      <div>
        <h3>{service.name}</h3>
        {service.description && <p className="muted">{service.description}</p>}
      </div>
      <div className="service-meta">
        <span className="price">{formatPrice(service.price)}</span>
        <span className="muted">{formatDuration(service.durationMinutes)}</span>
      </div>
      {onSelect && (
        <button type="button" className={`btn ${selected ? 'btn-primary' : 'btn-outline'}`} onClick={() => onSelect(service)}>
          {selected ? 'Seleccionado' : action}
        </button>
      )}
    </article>
  );
}
