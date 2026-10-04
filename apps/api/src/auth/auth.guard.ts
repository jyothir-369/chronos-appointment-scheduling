import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // Development bypass only when explicitly enabled (fail closed by default)
    if (process.env.NODE_ENV === 'production') {
      return false; // bypass never allowed in production
    }
    if (process.env.NO_REAL_AUTH === 'true') {
      req.user = { id: 'dev-user', role: 'admin' };
      return true;
    }
    // Production: require session cookie or bearer token (stub for extension)
    const cookie = req.headers?.cookie || '';
    const session = cookie.match(/chronos_session=([^;]+)/)?.[1];
    if (session) {
      req.user = { id: session, role: 'user' };
      return true;
    }
    // Production: real login not implemented yet — 401 is acceptable (Phase 1B)
    throw new UnauthorizedException('Authentication required — real login not implemented yet');
  }
}
