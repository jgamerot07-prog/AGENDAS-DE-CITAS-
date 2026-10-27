import { useCallback, useEffect, useState } from 'react';
import { api, tokenStorage } from '../api/client';
import { AuthContext } from './auth';

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()));

  const logout = useCallback(() => {
    tokenStorage.clear();
    setAdmin(null);
  }, []);

  // Al abrir la app, si hay un token guardado se valida con el servidor
  useEffect(() => {
    if (!tokenStorage.get()) return;
    api
      .me()
      .then((data) => setAdmin(data.admin))
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener('auth:expired', logout);
    return () => window.removeEventListener('auth:expired', logout);
  }, [logout]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    tokenStorage.set(data.token);
    setAdmin(data.admin);
  };

  return <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>;
}
