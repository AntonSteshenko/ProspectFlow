import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { DashboardPage } from './features/lists/pages/DashboardPage';
import { UploadPage } from './features/lists/pages/UploadPage';
import { ContactsPage } from './features/lists/pages/ContactsPage';
import { ListSettingsPage } from './features/lists/pages/ListSettingsPage';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'lists/:listId/upload',
        element: <UploadPage />,
      },
      {
        path: 'lists/:listId/contacts',
        element: <ContactsPage />,
      },
      {
        path: 'lists/:listId/settings',
        element: <ListSettingsPage />,
      },
    ],
  },
]);
