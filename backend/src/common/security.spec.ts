import { locationSlugFromHost, publicLocationUrl } from './security';

describe('public location domains', () => {
  const originalDomain = process.env.PUBLIC_BASE_DOMAIN;
  const originalProtocol = process.env.PUBLIC_PROTOCOL;

  beforeEach(() => {
    process.env.PUBLIC_BASE_DOMAIN = 'cartia.ar';
    process.env.PUBLIC_PROTOCOL = 'https';
  });

  afterAll(() => {
    if (originalDomain === undefined) delete process.env.PUBLIC_BASE_DOMAIN;
    else process.env.PUBLIC_BASE_DOMAIN = originalDomain;
    if (originalProtocol === undefined) delete process.env.PUBLIC_PROTOCOL;
    else process.env.PUBLIC_PROTOCOL = originalProtocol;
  });

  it('builds a subdomain QR URL', () => {
    expect(publicLocationUrl('restaurante-uno', 'token-123')).toBe('https://restaurante-uno.cartia.ar/?t=token-123#menu');
  });

  it('resolves only valid restaurant subdomains', () => {
    expect(locationSlugFromHost('restaurante-uno.cartia.ar')).toBe('restaurante-uno');
    expect(locationSlugFromHost('app.cartia.ar')).toBeUndefined();
    expect(locationSlugFromHost('cartia.ar')).toBeUndefined();
  });
});
