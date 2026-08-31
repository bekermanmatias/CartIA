import { Body, Controller, Get, MessageEvent, Post, Query, Req, Sse } from '@nestjs/common';
import { Request } from 'express';
import { filter, map, Observable } from 'rxjs';
import { requireCsrf, requireUserId } from '../common/security';
import { CartiaService } from './cartia.service';

@Controller('api/v1')
export class CartiaController {
  constructor(private readonly cartia: CartiaService) {}

  @Get('health') health() { return this.cartia.health(); }

  @Get('bootstrap') bootstrap(@Req() request: Request) { return this.cartia.bootstrap(requireUserId(request)); }
  @Get('tables') tables(@Req() request: Request) { return this.cartia.bootstrap(requireUserId(request)).then((payload) => ({ ok: true, tables: payload.tables })); }
  @Post('tables') createTable(@Req() request: Request, @Body() body: { label?: string }) { requireCsrf(request); return this.cartia.createTable(requireUserId(request), body.label ?? ''); }
  @Post('tables/archive') archiveTable(@Req() request: Request, @Body() body: { id?: string }) { requireCsrf(request); return this.cartia.archiveTable(requireUserId(request), body.id ?? ''); }
  @Get('requests') requests(@Req() request: Request) { return this.cartia.requests(requireUserId(request)); }
  @Post('requests/resolve') resolve(@Req() request: Request, @Body() body: { id?: string; kind?: string }) { requireCsrf(request); return this.cartia.resolveRequest(requireUserId(request), body.id ?? '', body.kind ?? 'service'); }
  @Get('analytics') analytics(@Req() request: Request, @Query('days') days?: string) { return this.cartia.analytics(requireUserId(request), Number(days ?? 7)); }
  @Post('settings') settings(@Req() request: Request, @Body() body: { serviceOptions?: { waiter?: boolean; bill?: boolean }; visualTheme?: { primary?: string; accent?: string; paper?: string; name?: string } }) { requireCsrf(request); return this.cartia.saveSettings(requireUserId(request), body); }
  @Post('dishes/save') dish(@Req() request: Request, @Body() body: { databaseId?: string; id?: string; name?: string; detail?: string; priceCents?: number; price?: string; badge?: string; category?: string; available?: boolean }) { requireCsrf(request); return this.cartia.saveDish(requireUserId(request), body); }

  @Get('public/menu') menu(@Query('r') restaurant: string, @Query('t') tableToken: string, @Query('v') visitor?: string) { return this.cartia.publicMenu(restaurant, tableToken, visitor); }
  @Post('public/request') publicRequest(@Body() body: { restaurant?: string; tableToken?: string; type?: string; visitorSession?: string }) { return this.cartia.publicServiceRequest(body); }
  @Post('public/order') publicOrder(@Body() body: { restaurant?: string; tableToken?: string; visitorSession?: string; items?: { dishId?: string; quantity?: number }[]; notes?: string }) { return this.cartia.publicOrder(body); }
  @Post('public/event') publicEvent(@Body() body: { restaurant?: string; tableToken?: string; visitorSession?: string; type?: string; dishId?: string; durationMs?: number }) { return this.cartia.publicEvent(body); }

  @Sse('admin/events')
  async events(@Req() request: Request): Promise<Observable<MessageEvent>> {
    const { locationId, stream } = await this.cartia.streamFor(requireUserId(request));
    return stream.pipe(
      filter((event) => event.locationId === locationId),
      map((event) => ({ type: event.type, data: event.data } as MessageEvent)),
    );
  }
}
