import { randomBytes, scrypt } from 'crypto';
import { PrismaClient } from '@prisma/client';

export class ProviderSessionService {
  private prisma = new PrismaClient();

  async hashToken(token: string): Promise<string> {
    return new Promise((res, rej) => {
      scrypt(token, 'provider_session_salt', 32, {N: 4096, r: 8, p: 1}, (err: any, key: Buffer) => {
        if (err) rej(err); else res(key.toString('base64'));
      });
    });
  }

  async createSession(providerId: string): Promise<{ token: string; tokenHash: string; expiresAt: Date }> {
    const rawToken = randomBytes(48).toString('base64');
    const tokenHash = await this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 86400000);
    await this.prisma.providerSession.create({
      data: { providerId, tokenHash, expiresAt },
    });
    return { token: rawToken, tokenHash, expiresAt };
  }

  async findProviderByTokenHash(tokenHash: string): Promise<{ providerId: string; provider: any } | null> {
    const session = await this.prisma.providerSession.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { provider: true },
    });
    if (!session) return null;
    return { providerId: session.providerId, provider: session.provider };
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await this.prisma.providerSession.deleteMany({ where: { tokenHash } });
  }

  async cleanupExpired(): Promise<void> {
    await this.prisma.providerSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
