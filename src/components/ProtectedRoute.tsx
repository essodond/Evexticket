import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAuthenticatedHomePath } from '../utils/portal';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowed?: AppRole | AppRole[];
}

type AppRole = 'admin' | 'company' | 'guichet' | 'user';

const mapUserToRole = (user: { is_staff?: boolean; is_company_admin?: boolean; is_guichet_agent?: boolean } | null): AppRole | null => {
  if (!user) return null;
  if (user.is_staff) return 'admin';
  if (user.is_company_admin) return 'company';
  if (user.is_guichet_agent) return 'guichet';
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
    const allowedRoles = Array.isArray(allowed) ? allowed : allowed ? [allowed] : [];
    if (allowedRoles.includes('admin')) return <Navigate to="/admin/login" replace />;
    if (allowedRoles.includes('company')) return <Navigate to="/company/login" replace />;
    if (allowedRoles.includes('guichet')) return <Navigate to="/guichet/login" replace />;
    return <Navigate to="/login" replace />;
  }

  const role = mapUserToRole(auth.user);
  if (!allowed) return children;
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedRoles.includes(role as AppRole)) {
    return <Navigate to={getAuthenticatedHomePath(auth.user)} replace />;
  }

  return children;
};

export default ProtectedRoute;

