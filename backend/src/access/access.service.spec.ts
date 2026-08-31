import { AccessService } from './access.service';

const actor = (role: 'OWNER' | 'ADMIN' | 'ANALYST', locationRole: 'MANAGER' | 'STAFF' | 'VIEWER' = 'STAFF') => ({
  platformAdmin: false,
  organizationMemberships: [{ organizationId: 'org-a', role }],
  locationMemberships: [{ locationId: 'loc-a', role: locationRole }],
});

describe('AccessService permission matrix', () => {
  const service = new AccessService({} as never);

  it('grants platform admins every permission', () => {
    expect(service.can({ ...actor('ANALYST'), platformAdmin: true }, 'organization', 'organization.users.manage', 'org-b')).toBe(true);
  });

  it('isolates organizations', () => {
    expect(service.can(actor('OWNER'), 'organization', 'organization.read', 'org-b')).toBe(false);
    expect(service.can(actor('OWNER'), 'organization', 'organization.read', 'org-a')).toBe(true);
  });

  it('keeps analyst read-only', () => {
    expect(service.can(actor('ANALYST'), 'organization', 'organization.users.read', 'org-a')).toBe(false);
    expect(service.can(actor('ANALYST'), 'organization', 'organization.read', 'org-a')).toBe(true);
  });

  it('limits staff and viewer operations', () => {
    expect(service.can(actor('ANALYST', 'STAFF'), 'location', 'requests.resolve', 'loc-a')).toBe(true);
    expect(service.can(actor('ANALYST', 'STAFF'), 'location', 'menu.manage', 'loc-a')).toBe(false);
    expect(service.can(actor('ANALYST', 'VIEWER'), 'location', 'requests.resolve', 'loc-a')).toBe(false);
  });

  it('allows managers to operate only assigned locations', () => {
    expect(service.can(actor('ANALYST', 'MANAGER'), 'location', 'tables.manage', 'loc-a')).toBe(true);
    expect(service.can(actor('ANALYST', 'MANAGER'), 'location', 'tables.manage', 'loc-b')).toBe(false);
  });
});
