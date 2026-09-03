import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new ConflictException('Este e-mail já está cadastrado.');

    const user = await this.prisma.user.create({
      data: { name: dto.name.trim(), email, passwordHash: await argon2.hash(dto.password) },
    });
    return { accessToken: this.createToken(user.id, user.email) };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    return { accessToken: this.createToken(user.id, user.email) };
  }

  private createToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
