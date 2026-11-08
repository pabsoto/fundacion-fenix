import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { isSessionExpired } from './token';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && isSessionExpired()) {
      logout();
    }
  }, [isAuthenticated, logout]);

  if (!isAuthenticated || isSessionExpired()) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
