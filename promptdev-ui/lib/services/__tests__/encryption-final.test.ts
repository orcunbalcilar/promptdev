/**
 * Tests for lib/services/encryption.ts — covering uncovered line:
 * L85: getEncryptionKey() auto-generates a runtime key when ENCRYPTION_KEY is not set
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("encryption – getEncryptionKey", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("derives key from ENCRYPTION_KEY env when set", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "a]Gv#3Bm$Rw!8Fz@pLq&Nk^5Ys*Wc0Hd");
    const { getEncryptionKey } = await import("@/lib/services/encryption");

    const key = getEncryptionKey();

    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it("auto-generates runtime key when ENCRYPTION_KEY is not set (L85)", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getEncryptionKey } = await import("@/lib/services/encryption");

    const key = getEncryptionKey();

    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("ENCRYPTION_KEY not set"),
    );
    consoleSpy.mockRestore();
  });

  it("auto-generates runtime key when ENCRYPTION_KEY is undefined", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    // Also delete to simulate truly unset
    delete process.env.ENCRYPTION_KEY;
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getEncryptionKey } = await import("@/lib/services/encryption");

    const key = getEncryptionKey();

    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
    consoleSpy.mockRestore();
  });

  it("returns cached key on subsequent calls", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "a]Gv#3Bm$Rw!8Fz@pLq&Nk^5Ys*Wc0Hd");
    const { getEncryptionKey } = await import("@/lib/services/encryption");

    const first = getEncryptionKey();
    const second = getEncryptionKey();

    expect(first).toBe(second);
  });

  it("decrypt fails gracefully with wrong key", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "a]Gv#3Bm$Rw!8Fz@pLq&Nk^5Ys*Wc0Hd");
    const { encrypt, decrypt, deriveKey } =
      await import("@/lib/services/encryption");

    const key1 = deriveKey("a]Gv#3Bm$Rw!8Fz@pLq&Nk^5Ys*Wc0Hd");
    const key2 = deriveKey("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    const encrypted = encrypt("secret", key1);

    expect(() => decrypt(encrypted, key2)).toThrow();
  });
});
