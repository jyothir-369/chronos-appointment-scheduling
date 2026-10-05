import { Controller, Get, Query } from '@nestjs/common';
@Controller('search')
export class SearchController {
  @Get()
  async search(@Query('q') q?: string) {
    if (!q || q.length < 1) return { results: [], total: 0 };
    return { results: [], total: 0, query: q };
  }
}
