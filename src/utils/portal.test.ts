import { describe, expect, it } from 'vitest';
import { getPortalFromHostname } from './portal';

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

  it('keeps the main domain as client portal', () => {
    expect(getPortalFromHostname('evex-tg.com')).toBe('client');
    expect(getPortalFromHostname('www.evex-tg.com')).toBe('client');
  });
});
