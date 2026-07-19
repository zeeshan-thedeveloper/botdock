import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { ProviderCredentialCryptoService } from './provider-credential-crypto.service.js';

describe('ProviderCredentialCryptoService', () => {
  const service = new ProviderCredentialCryptoService(
    new ConfigService({
      PROVIDER_CREDENTIAL_ENC_KEY: 'test-provider-credential-key-material-32',
    }),
  );

  it('encrypts and decrypts provider secrets without storing plaintext', () => {
    const secret = 'sk-test-secret-openai-key-1234';
    const encrypted = service.encrypt(secret);

    expect(encrypted).not.toContain(secret);
    expect(encrypted).toMatch(/^v1:/);
    expect(service.decrypt(encrypted)).toBe(secret);
  });

  it('uses a fresh nonce for each encryption', () => {
    const secret = 'sk-test-secret-openai-key-1234';

    expect(service.encrypt(secret)).not.toBe(service.encrypt(secret));
  });

  it('derives last4 and masked previews without exposing the full secret', () => {
    const last4 = service.getLast4('sk-test-secret-openai-key-1234');

    expect(last4).toBe('1234');
    expect(service.mask(last4)).toBe('****1234');
  });
});
