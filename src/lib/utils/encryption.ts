/**
 * Encryption Utility
 * AES-256 encryption for sensitive data (backups, credentials)
 */

import crypto from "node:crypto";

/**
 * Encryption Algorithm
 */
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Encrypted Data
 */
export interface EncryptedData {
  /** Encrypted content (base64) */
  data: string;
  /** Initialization vector (base64) */
  iv: string;
  /** Authentication tag (base64) */
  authTag: string;
  /** Salt used for key derivation (base64) */
  salt: string;
  /** Algorithm used */
  algorithm: string;
  /** Key version (for key rotation) */
  keyVersion?: string;
}

/**
 * Encryption Key Info
 */
export interface EncryptionKeyInfo {
  /** Key ID */
  id: string;
  /** Key version */
  version: string;
  /** Key creation date */
  createdAt: Date;
  /** Key expiration date */
  expiresAt?: Date;
  /** Algorithm */
  algorithm: string;
}

/**
 * Encryption Utility Class
 */
export class Encryption {
  /**
   * Generate a cryptographically secure encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString("base64");
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  static deriveKey(password: string, salt?: Buffer): { key: Buffer; salt: Buffer } {
    const actualSalt = salt || crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(password, actualSalt, 100000, KEY_LENGTH, "sha256");
    return { key, salt: actualSalt };
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  static encrypt(data: string, keyOrPassword: string, keyVersion?: string): EncryptedData {
    try {
      // Derive key from password
      const { key, salt } = this.deriveKey(keyOrPassword);

      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(data, "utf8"),
        cipher.final(),
      ]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        data: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        salt: salt.toString("base64"),
        algorithm: ALGORITHM,
        keyVersion,
      };
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  static decrypt(encrypted: EncryptedData, keyOrPassword: string): string {
    try {
      // Derive key from password using stored salt
      const salt = Buffer.from(encrypted.salt, "base64");
      const { key } = this.deriveKey(keyOrPassword, salt);

      // Parse encrypted data
      const iv = Buffer.from(encrypted.iv, "base64");
      const authTag = Buffer.from(encrypted.authTag, "base64");
      const data = Buffer.from(encrypted.data, "base64");

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final(),
      ]);

      return decrypted.toString("utf8");
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Encrypt file stream (for large files)
   */
  static createEncryptStream(keyOrPassword: string): {
    cipher: crypto.Cipher;
    iv: Buffer;
    salt: Buffer;
    getAuthTag: () => Buffer;
  } {
    const { key, salt } = this.deriveKey(keyOrPassword);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    return {
      cipher,
      iv,
      salt,
      getAuthTag: () => cipher.getAuthTag(),
    };
  }

  /**
   * Decrypt file stream (for large files)
   */
  static createDecryptStream(
    keyOrPassword: string,
    iv: Buffer,
    salt: Buffer,
    authTag: Buffer
  ): crypto.Decipher {
    const { key } = this.deriveKey(keyOrPassword, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher;
  }

  /**
   * Hash data (one-way)
   */
  static hash(data: string, algorithm: "sha256" | "sha512" = "sha256"): string {
    return crypto.createHash(algorithm).update(data).digest("hex");
  }

  /**
   * Generate HMAC signature
   */
  static hmac(data: string, secret: string, algorithm: "sha256" | "sha512" = "sha256"): string {
    return crypto.createHmac(algorithm, secret).update(data).digest("hex");
  }

  /**
   * Verify HMAC signature
   */
  static verifyHmac(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.hmac(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Generate checksum for integrity verification
   */
  static checksum(data: Buffer | string): string {
    const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Verify checksum
   */
  static verifyChecksum(data: Buffer | string, expectedChecksum: string): boolean {
    const actualChecksum = this.checksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Generate secure random string
   */
  static randomString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
  }

  /**
   * Generate secure random bytes
   */
  static randomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Encrypt configuration object (for storing sensitive config)
   */
  static encryptConfig<T extends Record<string, unknown>>(
    config: T,
    keyOrPassword: string,
    keyVersion?: string
  ): EncryptedData {
    const json = JSON.stringify(config);
    return this.encrypt(json, keyOrPassword, keyVersion);
  }

  /**
   * Decrypt configuration object
   */
  static decryptConfig<T extends Record<string, unknown>>(
    encrypted: EncryptedData,
    keyOrPassword: string
  ): T {
    const json = this.decrypt(encrypted, keyOrPassword);
    return JSON.parse(json) as T;
  }

  /**
   * Validate encryption key format
   */
  static validateKey(key: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!key) {
      errors.push("Encryption key is required");
      return { valid: false, errors };
    }

    if (key.length < 32) {
      errors.push("Encryption key must be at least 32 characters");
    }

    // Check if it's a valid base64 string
    try {
      const decoded = Buffer.from(key, "base64");
      if (decoded.length < KEY_LENGTH) {
        errors.push(`Encryption key must be at least ${KEY_LENGTH} bytes when decoded`);
      }
    } catch {
      // If not base64, check raw string length
      if (Buffer.from(key, "utf8").length < KEY_LENGTH) {
        errors.push(`Encryption key must be at least ${KEY_LENGTH} bytes`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate key info for tracking
   */
  static generateKeyInfo(version = "1"): EncryptionKeyInfo {
    return {
      id: crypto.randomUUID(),
      version,
      createdAt: new Date(),
      algorithm: ALGORITHM,
    };
  }

  /**
   * Rotate encryption key (re-encrypt with new key)
   */
  static rotateKey(encrypted: EncryptedData, oldKey: string, newKey: string, newVersion?: string): EncryptedData {
    // Decrypt with old key
    const decrypted = this.decrypt(encrypted, oldKey);

    // Encrypt with new key
    return this.encrypt(decrypted, newKey, newVersion);
  }
}
