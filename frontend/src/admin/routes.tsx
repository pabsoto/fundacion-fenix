import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { AuthProvider } from './auth/AuthContext';
import { AdminLayout } from './layout/AdminLayout';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const CampaignsPage = lazy(() => import('./features/campaigns/CampaignsPage'));
const AnimalsPage = lazy(() => import('./features/animals/AnimalsPage'));

export const adminRoutes = [
  {
    path: '/admin',
    element: (
      <AuthProvider>
        <RequireAuth>
          <AdminLayout />
        </RequireAuth>
      </AuthProvider>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/resumen" replace />,
      },
      {
        path: 'resumen',
        element: <DashboardPage />,
      },
      {
        path: 'campanas',
        element: <CampaignsPage />,
      },
      {
        path: 'animales',
        element: <AnimalsPage />,
      },
      {
        path: '*',
        element: (
          <div className="text-center">
            <h1 className="t-heading-lg">Página no encontrada</h1>
          </div>
        ),
      },
    ],
  },
];
