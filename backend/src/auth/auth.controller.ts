import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { ensureCsrf, requireCsrf, requireUserId } from '../common/security';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }, @Req() request: Request) {
    const user = await this.auth.validate(body.email ?? '', body.password ?? '');
    await new Promise<void>((resolve, reject) => request.session.regenerate((error) => error ? reject(error) : resolve()));
    request.session.userId = user.id;
    request.session.csrf = undefined;
    return { ok: true, user: await this.auth.payload(user.id), csrf: ensureCsrf(request) };
  }

  @Get('me')
  async me(@Req() request: Request) {
    if (!request.session?.userId) return { ok: true, authenticated: false, user: null, csrf: null };
    return { ok: true, authenticated: true, user: await this.auth.payload(request.session.userId), csrf: ensureCsrf(request) };
  }

  @Post('logout')
  logout(@Req() request: Request) {
    requireUserId(request);
    requireCsrf(request);
    request.session.destroy(() => undefined);
    return { ok: true };
  }
}
