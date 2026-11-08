import { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Administrador } from '@/services/auth.service';
import { saveSession, clearSession, type SessionData } from './token';

interface AuthContextValue {
  user: Administrador | null;
  isAuthenticated: boolean;
  login: (data: SessionData, user: Administrador) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Administrador | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const login = (data: SessionData, userData: Administrador) => {
    saveSession(data);
    setUser(userData);
  };

  const logout = () => {
    clearSession();
    setUser(null);
    queryClient.clear();
    navigate('/admin/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
