import { Controller, Get, Query, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ProviderAuthGuard } from '../auth/provider-auth.guard.js';
import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseGuards(ProviderAuthGuard)
  async search(@Request() req: any, @Query('q') q?: string) {
    const providerId = req.provider?.id;
    if (!providerId) throw new UnauthorizedException('Provider session required');
    if (!q || q.length < 1) return { results: { clients: [], eventTypes: [] }, total: 0, query: q || '' };
    const result = await this.searchService.searchProviderData(providerId, q);
    return { results: result, total: result.total, query: q, providerId };
  }
}
