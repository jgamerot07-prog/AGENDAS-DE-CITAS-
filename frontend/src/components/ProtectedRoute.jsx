import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth';
import Loader from './Loader';

export default function ProtectedRoute() {
  const { admin, loading } = useAuth();
  if (loading) return <Loader text="Verificando sesión..." />;
  return admin ? <Outlet /> : <Navigate to="/admin/login" replace />;
}
