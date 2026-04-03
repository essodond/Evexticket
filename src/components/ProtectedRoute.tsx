import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowed?: 'admin' | 'company' | 'user' | Array<'admin' | 'company' | 'user'>;
}

const mapUserToRole = (user: { is_staff?: boolean; is_company_admin?: boolean } | null) => {
  if (!user) return null;
  if (user.is_staff) return 'admin';
  if (user.is_company_admin) return 'company';
  return 'user';
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowed }) => {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }

  const role = mapUserToRole(auth.user);
  if (!allowed) return children;
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedRoles.includes(role as 'admin' | 'company' | 'user')) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'company') return <Navigate to="/company" replace />;
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default ProtectedRoute;

