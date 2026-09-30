import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
// Placeholder admin controller — authorization required, no public exposure
@Controller('admin')
export class AdminController {
  @Get('status')
  async status() {
    // Admin endpoint disabled until properly implemented with authorization
    throw new ForbiddenException('Admin endpoint not implemented');
  }
}
