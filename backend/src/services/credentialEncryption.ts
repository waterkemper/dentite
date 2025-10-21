import crypto from 'crypto';

/**
 * CredentialEncryption Service
 * 
 * Provides AES-256-GCM encryption/decryption for sensitive credentials
 * such as API keys, tokens, and passwords stored in the database.
 * 
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - Unique IV (Initialization Vector) per encryption
 * - Authentication tag for data integrity
 * - Base64 encoding for database storage
 */
export class CredentialEncryption {
  private algorithm = 'aes-256-gcm';
  private encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Ensure the key is 32 bytes (256 bits) for AES-256
    if (key.length !== 32 && Buffer.from(key, 'hex').length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }

    // Support both raw string and hex-encoded keys
    this.encryptionKey = key.length === 32 
      ? Buffer.from(key, 'utf-8') 
      : Buffer.from(key, 'hex');
  }

  /**
   * Encrypt plaintext data
   * @param plaintext - The data to encrypt
   * @returns Encrypted data in format: iv:authTag:encryptedData (base64)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    try {
      // Generate a random IV for each encryption (12 bytes for GCM)
      const iv = crypto.randomBytes(12);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv) as crypto.CipherGCM;
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data (all base64 encoded)
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    } catch (error: any) {
      console.error('Encryption error:', error.message);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt encrypted data
   * @param ciphertext - The encrypted data in format: iv:authTag:encryptedData
   * @returns Decrypted plaintext
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      throw new Error('Ciphertext cannot be empty');
    }

    try {
      // Split the combined string
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }

      const [ivBase64, authTagBase64, encryptedData] = parts;
      
      // Convert from base64
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error: any) {
      console.error('Decryption error:', error.message);
      throw new Error('Failed to decrypt data - data may be corrupted or encryption key changed');
    }
  }

  /**
   * Check if a string is encrypted (by checking format)
   * @param value - The value to check
   * @returns true if the value appears to be encrypted
   */
  isEncrypted(value: string): boolean {
    if (!value) return false;
    
    // Check if it matches the format: base64:base64:base64
    const parts = value.split(':');
    if (parts.length !== 3) return false;
    
    // Basic validation that each part is base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return parts.every(part => base64Regex.test(part));
  }

  /**
   * Generate a new encryption key (for setup/rotation)
   * @returns A hex-encoded 32-byte key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Singleton instance
let encryptionInstance: CredentialEncryption | null = null;

/**
 * Get the singleton encryption instance
 */
export function getEncryption(): CredentialEncryption {
  if (!encryptionInstance) {
    encryptionInstance = new CredentialEncryption();
  }
  return encryptionInstance;
}

/**
 * Helper functions for common credential encryption tasks
 */

/**
 * Safely encrypt a value, returning null if input is null/undefined
 */
export function encryptIfPresent(value: string | null | undefined): string | null {
  if (!value) return null;
  return getEncryption().encrypt(value);
}

/**
 * Safely decrypt a value, returning null if input is null/undefined
 */
export function decryptIfPresent(value: string | null | undefined): string | null {
  if (!value) return null;
  
  try {
    // Check if already decrypted (for backward compatibility)
    const encryption = getEncryption();
    if (!encryption.isEncrypted(value)) {
      console.warn('Attempting to decrypt non-encrypted value');
      return value; // Return as-is if not encrypted
    }
    
    return encryption.decrypt(value);
  } catch (error) {
    console.error('Failed to decrypt credential');
    return null;
  }
}

