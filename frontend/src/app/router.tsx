import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { StyleguidePage } from '@/pages/StyleguidePage';
import { AdminNoIndex } from '@/app/AdminNoIndex';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
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
        element: <AdminDashboardPage />,
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
