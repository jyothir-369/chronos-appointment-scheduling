import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const cookie = req.headers?.cookie || '';
    const session = cookie.match(/chronos_session=([^;]+)/)?.[1];
    if (session) {
      req.user = { id: session, role: 'user' };
      return true;
    }
    // Development bypass ONLY when explicitly enabled; production always requires session
    if (process.env.NO_REAL_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      req.user = { id: 'dev-user', role: 'client' };
      return true;
    }
    throw new UnauthorizedException('Authentication required');
  }
}
