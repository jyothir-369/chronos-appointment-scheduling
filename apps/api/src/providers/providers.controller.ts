import { Controller, Get, Post, Body, Patch, Param, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('providers')
export class ProvidersController {
  private prisma = new PrismaClient();

  @Get(':id')
  async getProvider(@Param('id') id: string) {
    const p = await this.prisma.provider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    return p;
  }

  @Patch(':id')
  async updateProvider(@Param('id') id: string, @Body() body: any) {
    const p = await this.prisma.provider.update({ where: { id }, data: body });
    return p;
  }
}
