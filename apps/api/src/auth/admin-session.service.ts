import { randomBytes, scrypt } from 'crypto';
import { PrismaClient } from '@prisma/client';

export class AdminSessionService {
  private prisma = new PrismaClient();

  private static readonly SCRYPT_PARAMS = { N: 4096, r: 8, p: 1 };

  async hashToken(token: string): Promise<string> {
    const salt = randomBytes(32).toString('base64');
    const derived = await new Promise<Buffer>((res, rej) => {
      scrypt(token, Buffer.from(salt, 'base64'), 32, AdminSessionService.SCRYPT_PARAMS, (err, key) => {
        if (err) rej(err); else res(key);
      });
    });
    return `scrypt:${salt}:${derived.toString('base64')}`;
  }

  async createSession(adminId: string, rawToken: string, expiresInMs = 8 * 60 * 60 * 1000) {
    const tokenHash = await this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInMs);
    return this.prisma.adminSession.create({
      data: { adminId, tokenHash, expiresAt },
    });
  }

  async findByToken(rawToken: string) {
    const tokenHash = await this.hashToken(rawToken);
    return this.prisma.adminSession.findFirst({
      where: { tokenHash },
      include: { admin: true },
    });
  }

  async revokeSession(token: string): Promise<void> {
    const tokenHash = await this.hashToken(token);
    await this.prisma.adminSession.deleteMany({ where: { tokenHash } });
  }

  async isValid(rawToken: string) {
    const session = await this.findByToken(rawToken);
    if (!session) return false;
    if (new Date() > session.expiresAt) return false;
    return true;
  }
}
