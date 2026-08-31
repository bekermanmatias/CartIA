import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { requireCsrf, requireUserId } from '../common/security';
import { OrganizationsService } from './organizations.service';

@Controller('api/v1')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}
  @Get('organizations') list(@Req() req: Request) { return this.organizations.list(requireUserId(req)); }
  @Post('organizations') create(@Req() req: Request, @Body() body: any) { requireCsrf(req); return this.organizations.create(requireUserId(req), body); }
  @Get('organizations/:organizationId') detail(@Req() req: Request, @Param('organizationId') id: string) { return this.organizations.detail(requireUserId(req), id); }
  @Post('organizations/:organizationId/locations') addLocation(@Req() req: Request, @Param('organizationId') id: string, @Body() body: any) { requireCsrf(req); return this.organizations.addLocation(requireUserId(req), id, body); }
  @Get('organizations/:organizationId/users') users(@Req() req: Request, @Param('organizationId') id: string) { return this.organizations.users(requireUserId(req), id); }
  @Post('organizations/:organizationId/users') createUser(@Req() req: Request, @Param('organizationId') id: string, @Body() body: any) { requireCsrf(req); return this.organizations.createUser(requireUserId(req), id, body); }
  @Patch('locations/:locationId') updateLocation(@Req() req: Request, @Param('locationId') id: string, @Body() body: any) { requireCsrf(req); return this.organizations.updateLocation(requireUserId(req), id, body); }
  @Patch('users/:userId') updateUser(@Req() req: Request, @Param('userId') id: string, @Body() body: any) { requireCsrf(req); return this.organizations.updateUser(requireUserId(req), id, body); }
  @Post('users/:userId/disable') disableUser(@Req() req: Request, @Param('userId') id: string, @Body() body: { organizationId?: string }) { requireCsrf(req); return this.organizations.disableUser(requireUserId(req), id, body.organizationId ?? ''); }
}
