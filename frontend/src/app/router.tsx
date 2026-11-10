import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { StyleguidePage } from '@/pages/StyleguidePage';
import { AdminNoIndex } from '@/app/AdminNoIndex';
import { AdminGuard } from '@/app/AdminGuard';
import { textosAdmin } from '@/content/textos-admin';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminDonacionesPage } from '@/pages/admin/AdminDonacionesPage';
import { AdminCampanasPage } from '@/pages/admin/AdminCampanasPage';
import { AdminSeccionVacia } from '@/pages/admin/AdminSeccionVacia';
import { ComponentesAdminPage } from '@/pages/admin/ComponentesAdminPage';
import { PublicLayout } from '@/components/layout/PublicLayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
  ...(import.meta.env.DEV
    ? [
        {
          path: '/styleguide',
          element: <StyleguidePage />,
        },
      ]
    : []),
  {
    element: <AdminNoIndex />,
    children: [
      {
        path: '/admin/login',
        element: <AdminLoginPage />,
      },
      {
        path: '/admin',
        element: <AdminGuard />,
        children: [
          {
            element: <AdminDashboardPage />,
            children: [
              {
                index: true,
                element: <AdminSeccionVacia titulo={textosAdmin.resumen.titulo} />,
              },
              {
                path: 'campanas',
                element: <AdminCampanasPage />,
              },
              {
                path: 'animales',
                element: <AdminSeccionVacia titulo={textosAdmin.animales.titulo} />,
              },
              {
                path: 'donaciones',
                element: <AdminDonacionesPage />,
              },
            ],
          },
        ],
      },
      {
        path: '/admin/_componentes',
        element: <ComponentesAdminPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
