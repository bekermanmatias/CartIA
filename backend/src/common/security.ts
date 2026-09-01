import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { randomBytes } from 'crypto';

export function requireUserId(request: Request): string {
  if (!request.session?.userId) throw new UnauthorizedException('Debes iniciar sesión.');
  return request.session.userId;
}

export function ensureCsrf(request: Request): string {
  if (!request.session.csrf) request.session.csrf = randomBytes(24).toString('hex');
  return request.session.csrf;
}

export function requireCsrf(request: Request): void {
  const value = request.header('x-csrf-token');
  if (!value || value !== ensureCsrf(request)) throw new ForbiddenException('La sesión cambió. Recarga la página e intenta nuevamente.');
}

export function slugify(value: string, fallback = 'location'): string {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (normalized.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || fallback).slice(0, 80);
}

export const reservedLocationSlugs = new Set(['app', 'api', 'www', 'admin', 'cartia']);

export function publicLocationUrl(slug: string, token?: string): string {
  const domain = (process.env.PUBLIC_BASE_DOMAIN ?? '').trim().toLowerCase();
  if (!domain) return token ? `/?r=${slug}&t=${token}#menu` : `/?r=${slug}#menu`;
  const protocol = process.env.PUBLIC_PROTOCOL === 'http' ? 'http' : 'https';
  return `${protocol}://${slug}.${domain}/${token ? `?t=${token}#menu` : ''}`;
}

export function locationSlugFromHost(hostname?: string): string | undefined {
  const domain = (process.env.PUBLIC_BASE_DOMAIN ?? '').trim().toLowerCase();
  const host = (hostname ?? '').split(':')[0].toLowerCase();
  if (!domain || !host.endsWith(`.${domain}`)) return undefined;
  const slug = host.slice(0, -(domain.length + 1));
  return slug && !slug.includes('.') && !reservedLocationSlugs.has(slug) ? slug : undefined;
}
