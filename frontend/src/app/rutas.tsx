import { Navigate, type RouteObject } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { StyleguidePage } from '@/pages/StyleguidePage';
import { AdminNoIndex } from '@/app/AdminNoIndex';
import { AdminGuard } from '@/app/AdminGuard';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminDonacionesPage } from '@/pages/admin/AdminDonacionesPage';
import { AdminContenidoPage } from '@/pages/admin/AdminContenidoPage';
import { AdminCampanasPage } from '@/pages/admin/AdminCampanasPage';
import { AdminAnimalesPage } from '@/pages/admin/AdminAnimalesPage';
import { AdminResumenPage } from '@/pages/admin/AdminResumenPage';
import { ComponentesAdminPage } from '@/pages/admin/ComponentesAdminPage';
import { PublicLayout } from '@/components/layout/PublicLayout';

export const rutasAplicacion: RouteObject[] = [
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
                element: <AdminResumenPage />,
              },
              {
                path: 'campanas',
                element: <AdminCampanasPage />,
              },
              {
                path: 'animales',
                element: <AdminAnimalesPage />,
              },
              {
                path: 'donaciones',
                element: <AdminDonacionesPage />,
              },
              {
                path: 'canales',
                element: <Navigate to="/admin/contenido" replace />,
              },
              {
                path: 'contenido',
                element: <AdminContenidoPage />,
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
];
