import { describe, expect, it } from 'vitest';
import { companyDefaultPath, companyNavigationItems } from './companyNavigation';
import { getAuthenticatedHomePath, getPortalFromHostname } from './portal';

describe('getPortalFromHostname', () => {
  it('detects admin subdomains', () => {
    expect(getPortalFromHostname('admin.evex-tg.com')).toBe('admin');
    expect(getPortalFromHostname('ADMIN.LOCALHOST')).toBe('admin');
  });

  it('detects company subdomains', () => {
    expect(getPortalFromHostname('compagnie.evex-tg.com')).toBe('company');
    expect(getPortalFromHostname('company.evex-tg.com')).toBe('company');
    expect(getPortalFromHostname('compagnie.localhost')).toBe('company');
  });

  it('detects guichet subdomains', () => {
    expect(getPortalFromHostname('guichet.evex-tg.com')).toBe('guichet');
    expect(getPortalFromHostname('GUICHET.LOCALHOST')).toBe('guichet');
  });

  it('keeps the main domain as client portal', () => {
    expect(getPortalFromHostname('evex-tg.com')).toBe('client');
    expect(getPortalFromHostname('www.evex-tg.com')).toBe('client');
  });
});

describe('getAuthenticatedHomePath', () => {
  it('redirects every authenticated role to its own dashboard', () => {
    expect(getAuthenticatedHomePath({ is_superuser: true })).toBe('/admin');
    expect(getAuthenticatedHomePath({ is_staff: true })).toBe('/admin');
    expect(getAuthenticatedHomePath({ is_company_admin: true })).toBe('/company');
    expect(getAuthenticatedHomePath({ is_guichet_agent: true })).toBe('/guichet');
    expect(getAuthenticatedHomePath({})).toBe('/home');
  });
});

describe('company navigation', () => {
  it('uses one dedicated route per sidebar entry without anchors', () => {
    expect(companyDefaultPath).toBe('/company/tableau-de-bord');
    expect(companyNavigationItems).toHaveLength(10);
    expect(new Set(companyNavigationItems.map((item) => item.path)).size).toBe(companyNavigationItems.length);
    expect(companyNavigationItems.every((item) => item.path.startsWith('/company/') && !item.path.includes('#'))).toBe(true);
  });
});
