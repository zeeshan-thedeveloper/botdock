import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

@Injectable()
export class ProviderCredentialCryptoService {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  encrypt(secret: string): string {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':');
  }

  decrypt(encryptedSecret: string): string {
    const [version, encodedIv, encodedAuthTag, encodedCiphertext] = encryptedSecret.split(':');

    if (version !== 'v1' || !encodedIv || !encodedAuthTag || !encodedCiphertext) {
      throw new Error('Provider credential ciphertext is malformed.');
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      this.getKey(),
      Buffer.from(encodedIv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(encodedAuthTag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  getLast4(secret: string): string {
    return secret.slice(-4);
  }

  mask(last4: string): string {
    return `****${last4}`;
  }

  private getKey(): Buffer {
    return createHash('sha256')
      .update(this.configService.getOrThrow<string>('PROVIDER_CREDENTIAL_ENC_KEY'))
      .digest();
  }
}
