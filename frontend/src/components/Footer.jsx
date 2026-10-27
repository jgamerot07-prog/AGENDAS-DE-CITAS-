import { BUSINESS_NAME } from '../config';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          {BUSINESS_NAME} · Barranquilla, Colombia · Reservas en línea con <strong>AgendaPro</strong>
        </p>
      </div>
    </footer>
  );
}
