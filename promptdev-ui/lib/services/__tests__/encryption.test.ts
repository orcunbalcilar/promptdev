import { describe, it, expect, vi, afterEach } from "vitest";
import { deriveKey, encrypt, decrypt } from "../encryption";

describe("encryption service", () => {
  describe("deriveKey", () => {
    it("should derive a 32-byte key from a valid string", () => {
      const key = deriveKey("a]Gv#3Bm$Rw!8Fz@pLq&Nk^5Ys*Wc0Hd");
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it("should use only first 32 bytes of longer key", () => {
      const longKey = "a".repeat(64);
      const key = deriveKey(longKey);
      expect(key.length).toBe(32);
      expect(key.toString("utf-8")).toBe("a".repeat(32));
    });

    it("should throw for empty key", () => {
      expect(() => deriveKey("")).toThrow("must not be null or blank");
    });

    it("should throw for whitespace-only key", () => {
      expect(() => deriveKey("   ")).toThrow("must not be null or blank");
    });

    it("should throw for key shorter than 32 bytes", () => {
      expect(() => deriveKey("short")).toThrow("must be at least 32 bytes");
    });
  });

  describe("encrypt / decrypt", () => {
    const key = deriveKey("a]Gv#3Bm$Rw!8Fz@pLq&Nk^5Ys*Wc0Hd");

    it("should round-trip encrypt and decrypt", () => {
      const plaintext = "hello world";
      const ciphertext = encrypt(plaintext, key);
      const decrypted = decrypt(ciphertext, key);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce base64-encoded ciphertext", () => {
      const ciphertext = encrypt("test", key);
      expect(() => Buffer.from(ciphertext, "base64")).not.toThrow();
      // base64 length should be greater than plaintext
      expect(ciphertext.length).toBeGreaterThan(4);
    });

    it("should produce different ciphertexts for same plaintext (unique IVs)", () => {
      const plaintext = "same input";
      const ct1 = encrypt(plaintext, key);
      const ct2 = encrypt(plaintext, key);
      expect(ct1).not.toBe(ct2);
    });

    it("should handle empty string", () => {
      const ciphertext = encrypt("", key);
      expect(decrypt(ciphertext, key)).toBe("");
    });

    it("should handle unicode characters", () => {
      const plaintext = "Ünïcödé çhàráctérs 日本語 🎉";
      const ciphertext = encrypt(plaintext, key);
      expect(decrypt(ciphertext, key)).toBe(plaintext);
    });

    it("should fail to decrypt with wrong key", () => {
      const key2 = deriveKey("x]Gv#3Bm$Rw!8Fz@pLq&Nk^5Ys*Wc0XX");
      const ciphertext = encrypt("secret", key);
      expect(() => decrypt(ciphertext, key2)).toThrow();
    });

    it("should fail to decrypt corrupted ciphertext", () => {
      const ciphertext = encrypt("test", key);
      const corrupted = ciphertext.slice(0, -4) + "XXXX";
      expect(() => decrypt(corrupted, key)).toThrow();
    });
  });

  describe("getEncryptionKey", () => {
    const originalEnv = process.env.ENCRYPTION_KEY;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.ENCRYPTION_KEY;
      } else {
        process.env.ENCRYPTION_KEY = originalEnv;
      }
    });

    it("should auto-generate a key when ENCRYPTION_KEY is not set", async () => {
      delete process.env.ENCRYPTION_KEY;
      // getEncryptionKey caches, so we need a fresh module
      vi.resetModules();
      const {
        getEncryptionKey: freshGetKey,
        encrypt: freshEncrypt,
        decrypt: freshDecrypt,
      } = await import("../encryption");
      const key = freshGetKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);

      // Should be usable for encryption
      const ct = freshEncrypt("test", key);
      expect(freshDecrypt(ct, key)).toBe("test");
    });
  });
});
