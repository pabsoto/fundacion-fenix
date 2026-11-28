import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { rutasAplicacion } from '@/app/rutas';

const router = createBrowserRouter(rutasAplicacion);

export function Router() {
  return <RouterProvider router={router} />;
}
