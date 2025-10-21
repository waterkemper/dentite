import { CredentialEncryption, encryptIfPresent, decryptIfPresent } from '../credentialEncryption';

describe('CredentialEncryption', () => {
  let encryption: CredentialEncryption;

  beforeAll(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'; // 32 bytes
  });

  beforeEach(() => {
    encryption = new CredentialEncryption();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string successfully', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'test-secret';
      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(encryption.decrypt(encrypted1)).toBe(plaintext);
      expect(encryption.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should throw error on empty plaintext', () => {
      expect(() => encryption.encrypt('')).toThrow('Plaintext cannot be empty');
    });

    it('should throw error on empty ciphertext', () => {
      expect(() => encryption.decrypt('')).toThrow('Ciphertext cannot be empty');
    });

    it('should throw error on invalid ciphertext format', () => {
      expect(() => encryption.decrypt('invalid')).toThrow('Invalid ciphertext format');
    });

    it('should throw error on corrupted ciphertext', () => {
      const encrypted = encryption.encrypt('test');
      const corrupted = encrypted.replace(/.$/, 'X'); // Corrupt last character

      expect(() => encryption.decrypt(corrupted)).toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('should identify encrypted strings', () => {
      const encrypted = encryption.encrypt('test');
      expect(encryption.isEncrypted(encrypted)).toBe(true);
    });

    it('should identify non-encrypted strings', () => {
      expect(encryption.isEncrypted('plaintext')).toBe(false);
      expect(encryption.isEncrypted('not:encrypted')).toBe(false);
      expect(encryption.isEncrypted('')).toBe(false);
    });
  });

  describe('helper functions', () => {
    it('encryptIfPresent should handle null/undefined', () => {
      expect(encryptIfPresent(null)).toBeNull();
      expect(encryptIfPresent(undefined)).toBeNull();
    });

    it('encryptIfPresent should encrypt valid strings', () => {
      const encrypted = encryptIfPresent('test');
      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe('test');
    });

    it('decryptIfPresent should handle null/undefined', () => {
      expect(decryptIfPresent(null)).toBeNull();
      expect(decryptIfPresent(undefined)).toBeNull();
    });

    it('decryptIfPresent should decrypt valid ciphertexts', () => {
      const encrypted = encryptIfPresent('test');
      const decrypted = decryptIfPresent(encrypted!);
      expect(decrypted).toBe('test');
    });

    it('decryptIfPresent should handle non-encrypted strings gracefully', () => {
      const result = decryptIfPresent('plaintext');
      expect(result).toBe('plaintext'); // Returns as-is for backward compatibility
    });
  });

  describe('generateKey', () => {
    it('should generate a valid 32-byte hex key', () => {
      const key = CredentialEncryption.generateKey();
      expect(key).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique keys', () => {
      const key1 = CredentialEncryption.generateKey();
      const key2 = CredentialEncryption.generateKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('key validation', () => {
    it('should throw error if ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => new CredentialEncryption()).toThrow('ENCRYPTION_KEY environment variable is required');

      // Restore for other tests
      process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
    });

    it('should throw error if ENCRYPTION_KEY is wrong length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short';

      expect(() => new CredentialEncryption()).toThrow('ENCRYPTION_KEY must be 32 bytes');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});

