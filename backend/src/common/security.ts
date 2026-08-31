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
