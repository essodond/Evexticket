import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowed?: 'admin' | 'company' | 'user' | Array<'admin' | 'company' | 'user'>;
}

const mapUserToRole = (user: any) => {
  if (!user) return null;
  if (user.is_staff) return 'admin';
  if (user.is_company_admin) return 'company';
  return 'user';
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowed }) => {
  const auth = useAuth();
  if (auth.loading) return null; // Or a spinner
  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }
  const role = mapUserToRole(auth.user);
  if (!allowed) return children;
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedRoles.includes(role as any)) {
    // forbidden for this role
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'company') return <Navigate to="/company" replace />;
    return <Navigate to="/home" replace />;
  }
  return children;
};

export default ProtectedRoute;
