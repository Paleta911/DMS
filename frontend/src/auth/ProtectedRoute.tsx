import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) {
    // replace evita volver a una ruta protegida con el boton "atras".
    return <Navigate to="/login" replace />;
  }
  // Outlet renderiza el arbol protegido cuando existe sesion valida.
  return <Outlet />;
}
