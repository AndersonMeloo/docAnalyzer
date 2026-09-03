import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from './current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.access_token as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Autenticação necessária.');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.email !== 'string' || !payload.email) {
        throw new UnauthorizedException('Sessão inválida ou expirada.');
      }
      request.user = { userId: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
  }
}
