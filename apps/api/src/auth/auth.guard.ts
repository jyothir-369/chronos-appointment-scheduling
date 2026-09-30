import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // Development bypass only when explicitly enabled (fail closed by default)
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
    return false;
  }
}
