import { createContext, useContext } from 'react';
import type { SesionActual } from '@/services/auth.service';

const AdminSesionContext = createContext<SesionActual | null>(null);

export const AdminSesionProvider = AdminSesionContext.Provider;

export function useAdminSesion(): SesionActual {
  const sesion = useContext(AdminSesionContext);
  if (!sesion) {
    throw new Error('useAdminSesion debe usarse dentro del guard del panel.');
  }
  return sesion;
}
