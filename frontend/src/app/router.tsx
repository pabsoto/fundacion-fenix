import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { StyleguidePage } from '@/pages/StyleguidePage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
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
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: <AdminDashboardPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
