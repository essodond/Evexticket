export type AuthPortal = 'client' | 'company' | 'admin';

export const getPortalFromHostname = (hostname?: string): AuthPortal => {
  const host = (hostname || '').toLowerCase();
  if (!host) return 'client';

  if (host.startsWith('admin.') || host === 'admin' || host.startsWith('admin-')) return 'admin';
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
