export type AuthPortal = 'client' | 'company' | 'guichet' | 'admin';

export interface AuthenticatedUserRole {
  is_staff?: boolean;
  is_superuser?: boolean;
  is_company_admin?: boolean;
  is_guichet_agent?: boolean;
}

export const getAuthenticatedHomePath = (user?: AuthenticatedUserRole | null) => {
  if (user?.is_superuser || user?.is_staff) return '/admin';
  if (user?.is_company_admin) return '/company';
  if (user?.is_guichet_agent) return '/guichet';
  return '/home';
};

export const getPortalFromHostname = (hostname?: string): AuthPortal => {
  const host = (hostname || '').toLowerCase();
  if (!host) return 'client';

  if (host.startsWith('admin.') || host === 'admin' || host.startsWith('admin-')) return 'admin';
  if (host.startsWith('guichet.') || host === 'guichet' || host.startsWith('guichet-')) return 'guichet';
  if (
    host.startsWith('compagnie.') ||
    host.startsWith('company.') ||
    host === 'compagnie' ||
    host === 'company' ||
    host.startsWith('compagnie-') ||
    host.startsWith('company-')
  ) {
    return 'company';
  }

  return 'client';
};
