/**
 * AES-256-GCM encryption utility for storing sensitive data (tokens, passwords).
 *
 * Uses a 256-bit key derived from the ENCRYPTION_KEY environment variable.
 * Each encryption produces a unique IV, making identical plaintexts produce different ciphertexts.
 *
 * AES-256-GCM encryption utility for securing sensitive tokens.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Derive a 256-bit key from a string.
 * The key must be at least 32 bytes (256 bits) for AES-256.
 */
export function deriveKey(keyString: string): Buffer {
  if (!keyString || keyString.trim() === "") {
    throw new Error("Encryption key must not be null or blank");
  }
  const inputBytes = Buffer.from(keyString, "utf-8");
  if (inputBytes.length < 32) {
    throw new Error(
      `Encryption key must be at least 32 bytes, got ${inputBytes.length}`,
    );
  }
  return inputBytes.subarray(0, 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns Base64-encoded ciphertext with IV prepended.
 * Compatible with the Java EncryptionUtil format.
 */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Match Java format: IV + ciphertext + authTag (GCM appends tag to ciphertext)
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString("base64");
}

/**
 * Decrypt a Base64-encoded AES-256-GCM ciphertext.
 * Expects IV prepended format (compatible with Java EncryptionUtil).
 */
export function decrypt(encryptedBase64: string, key: Buffer): string {
  const combined = Buffer.from(encryptedBase64, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}

// ── Singleton key management ────────────────────────────────────

let _encryptionKey: Buffer | null = null;

/**
 * Get the encryption key, auto-generating one if ENCRYPTION_KEY is not set.
 * Generated keys are stable for the JVM lifetime but won't survive restarts.
 */
export function getEncryptionKey(): Buffer {
  if (_encryptionKey) return _encryptionKey;

  const keyStr = process.env.ENCRYPTION_KEY;
  if (keyStr && keyStr.trim() !== "") {
    _encryptionKey = deriveKey(keyStr);
  } else {
    console.warn(
      "ENCRYPTION_KEY not set — auto-generated a runtime key. " +
        "Encrypted tokens will NOT survive application restarts. " +
        "Set ENCRYPTION_KEY env var for persistent encryption.",
    );
    _encryptionKey = randomBytes(32);
  }
  return _encryptionKey;
}
