import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/storage';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
