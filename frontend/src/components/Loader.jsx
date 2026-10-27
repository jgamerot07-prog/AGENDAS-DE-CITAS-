export default function Loader({ text = 'Cargando...' }) {
  return (
    <div className="loader" role="status">
      <span className="spinner" aria-hidden="true" />
      {text}
    </div>
  );
}
