import { randomBytes, scrypt } from 'crypto';

export class PasswordService {
  private static readonly SALT_LENGTH = 32;
  private static readonly KEY_LENGTH = 64;
  private static readonly SCRYPT_PARAMS = { N: 4096, r: 8, p: 1 };

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(32).toString('base64');
    const derived = await new Promise<Buffer>((res, rej) => {
      scrypt(password, Buffer.from(salt, 'base64'), 32, PasswordService.SCRYPT_PARAMS, (err, key) => {
        if (err) rej(err); else res(key);
      });
    });
    return `scrypt:${salt}:${derived.toString('base64')}`;
  }

  async verifyPassword(password: string, encoded: string): Promise<boolean> {
    const [scheme, salt, derived] = encoded.split(':');
    if (scheme !== 'scrypt' || !salt || !derived) return false;
    const derivedKey = await new Promise<Buffer>((res, rej) => {
      scrypt(password, Buffer.from(salt, 'base64'), 32, PasswordService.SCRYPT_PARAMS, (err, key) => {
        if (err) rej(err); else res(key);
      });
    });
    return derivedKey.toString('base64') === derived;
  }
}
