import { Link } from "react-router-dom";
import { ShellHeader } from "./ShellHeader";

export function NotFound() {
  return (
    <div className="app-shell">
      <ShellHeader />
      <div className="panel">
        <span className="panel-eyebrow">Error 404</span>
        <h1 className="panel-title">Página no encontrada</h1>
        <p className="panel-subtitle">
          El enlace no existe o el viaje ya no está disponible.
        </p>
        <Link to="/" className="panel-link">
          ← Crear un nuevo viaje
        </Link>
      </div>
    </div>
  );
}
