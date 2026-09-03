import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextWithCookies(cookies: Record<string, string> = {}): ExecutionContext {
  const request = { cookies };
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('rejeita requisições sem cookie de sessão', () => {
    const guard = new JwtAuthGuard({} as JwtService);

    expect(() => guard.canActivate(contextWithCookies())).toThrow(UnauthorizedException);
  });

  it('rejeita payload sem identificador de usuário', () => {
    const jwtService = { verify: jest.fn().mockReturnValue({ email: 'analista@example.com' }) } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService);

    expect(() => guard.canActivate(contextWithCookies({ access_token: 'token' }))).toThrow(UnauthorizedException);
  });

  it('anexa o usuário autenticado ao request quando o payload é válido', () => {
    const jwtService = { verify: jest.fn().mockReturnValue({ sub: 'user-1', email: 'analista@example.com' }) } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService);
    const context = contextWithCookies({ access_token: 'token' });

    expect(guard.canActivate(context)).toBe(true);
    expect((context.switchToHttp().getRequest() as { user?: unknown }).user).toEqual({ userId: 'user-1', email: 'analista@example.com' });
  });
});