import { Body, Controller, Get, MessageEvent, Param, Post, Query, Req, Sse } from '@nestjs/common';
import { Request } from 'express';
import { filter, map, Observable } from 'rxjs';
import { locationSlugFromHost, requireCsrf, requireUserId } from '../common/security';
import { CartiaService } from './cartia.service';

@Controller('api/v1')
export class CartiaController {
  constructor(private readonly cartia: CartiaService) {}

  @Get('health') health() { return this.cartia.health(); }

  @Get('bootstrap') bootstrap(@Req() request: Request) { return this.cartia.bootstrap(requireUserId(request), request.session.activeLocationId); }
  @Get('tables') tables(@Req() request: Request) { return this.cartia.bootstrap(requireUserId(request), request.session.activeLocationId).then((payload) => ({ ok: true, tables: payload.tables })); }
  @Post('tables') createTable(@Req() request: Request, @Body() body: { label?: string }) { requireCsrf(request); return this.cartia.createTable(requireUserId(request), body.label ?? '', request.session.activeLocationId); }
  @Post('tables/archive') archiveTable(@Req() request: Request, @Body() body: { id?: string; archive?: boolean }) { requireCsrf(request); return this.cartia.archiveTable(requireUserId(request), body.id ?? '', body.archive !== false, request.session.activeLocationId); }
  @Get('requests') requests(@Req() request: Request) { return this.cartia.requests(requireUserId(request), request.session.activeLocationId); }
  @Get('operations') operations(@Req() request: Request) { return this.cartia.operations(requireUserId(request), request.session.activeLocationId); }
  @Post('requests/resolve') resolve(@Req() request: Request, @Body() body: { id?: string; kind?: string }) { requireCsrf(request); return this.cartia.resolveRequest(requireUserId(request), body.id ?? '', body.kind ?? 'service', request.session.activeLocationId); }
  @Post('orders/:id/status') orderStatus(@Req() request: Request, @Param('id') id: string, @Body() body: { status?: string }) { requireCsrf(request); return this.cartia.updateOrderStatus(requireUserId(request), id, body.status ?? '', request.session.activeLocationId); }
  @Get('analytics') analytics(@Req() request: Request, @Query('days') days?: string) { return this.cartia.analytics(requireUserId(request), Number(days ?? 7), request.session.activeLocationId); }
  @Post('settings') settings(@Req() request: Request, @Body() body: { serviceOptions?: { waiter?: boolean; bill?: boolean }; visualTheme?: { primary?: string; accent?: string; paper?: string; name?: string; font?: string } }) { requireCsrf(request); return this.cartia.saveSettings(requireUserId(request), body, request.session.activeLocationId); }
  @Post('dishes/save') dish(@Req() request: Request, @Body() body: { databaseId?: string; id?: string; name?: string; detail?: string; priceCents?: number; price?: string; badge?: string; categoryId?: string; available?: boolean }) { requireCsrf(request); return this.cartia.saveDish(requireUserId(request), body, request.session.activeLocationId); }
  @Post('dishes/archive') archiveDish(@Req() request: Request, @Body() body: { id?: string; archive?: boolean }) { requireCsrf(request); return this.cartia.archiveDish(requireUserId(request), body.id ?? '', body.archive !== false, request.session.activeLocationId); }
  @Post('dishes/reorder') reorderDishes(@Req() request: Request, @Body() body: { ids?: string[] }) { requireCsrf(request); return this.cartia.reorderDishes(requireUserId(request), body.ids ?? [], request.session.activeLocationId); }
  @Post('categories/save') saveCategory(@Req() request: Request, @Body() body: { id?: string; name?: string }) { requireCsrf(request); return this.cartia.saveCategory(requireUserId(request), body, request.session.activeLocationId); }
  @Post('categories/archive') archiveCategory(@Req() request: Request, @Body() body: { id?: string; archive?: boolean }) { requireCsrf(request); return this.cartia.archiveCategory(requireUserId(request), body.id ?? '', body.archive !== false, request.session.activeLocationId); }
  @Post('categories/reorder') reorderCategories(@Req() request: Request, @Body() body: { ids?: string[] }) { requireCsrf(request); return this.cartia.reorderCategories(requireUserId(request), body.ids ?? [], request.session.activeLocationId); }

  private publicSlug(request: Request, legacy?: string) { return locationSlugFromHost(request.hostname) ?? legacy ?? ''; }
  @Get('public/menu') menu(@Req() req: Request, @Query('r') restaurant?: string, @Query('t') tableToken?: string, @Query('v') visitor?: string) { return this.cartia.publicMenu(this.publicSlug(req, restaurant), tableToken, visitor); }
  @Post('public/request') publicRequest(@Req() req: Request, @Body() body: { restaurant?: string; tableToken?: string; type?: string; visitorSession?: string }) { return this.cartia.publicServiceRequest({ ...body, restaurant: this.publicSlug(req, body.restaurant) }); }
  @Post('public/order') publicOrder(@Req() req: Request, @Body() body: { restaurant?: string; tableToken?: string; visitorSession?: string; items?: { dishId?: string; quantity?: number }[]; notes?: string }) { return this.cartia.publicOrder({ ...body, restaurant: this.publicSlug(req, body.restaurant) }); }
  @Post('public/event') publicEvent(@Req() req: Request, @Body() body: { restaurant?: string; tableToken?: string; visitorSession?: string; type?: string; dishId?: string; durationMs?: number }) { return this.cartia.publicEvent({ ...body, restaurant: this.publicSlug(req, body.restaurant) }); }

  @Sse('admin/events')
  async events(@Req() request: Request): Promise<Observable<MessageEvent>> {
    const { locationId, stream } = await this.cartia.streamFor(requireUserId(request), request.session.activeLocationId);
    return stream.pipe(
      filter((event) => event.locationId === locationId),
      map((event) => ({ type: event.type, data: event.data } as MessageEvent)),
    );
  }
}
