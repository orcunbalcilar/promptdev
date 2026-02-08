package com.promptdev.util;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption utility for storing sensitive data (tokens, passwords).
 *
 * Uses a 256-bit key derived from the ENCRYPTION_KEY environment variable.
 * Each encryption produces a unique IV, making identical plaintexts produce different ciphertexts.
 */
public final class EncryptionUtil {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private EncryptionUtil() {}

    /**
     * Encrypt a plaintext string using AES-256-GCM.
     *
     * @param plaintext the string to encrypt
     * @param key the encryption key (must be 32 bytes / 256 bits)
     * @return Base64-encoded ciphertext (IV prepended)
     */
    public static String encrypt(String plaintext, SecretKey key) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, parameterSpec);

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Prepend IV to ciphertext
            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    /**
     * Decrypt a Base64-encoded AES-256-GCM ciphertext.
     *
     * @param encrypted the Base64-encoded ciphertext (IV prepended)
     * @param key the encryption key
     * @return the original plaintext
     */
    public static String decrypt(String encrypted, SecretKey key) {
        try {
            byte[] combined = Base64.getDecoder().decode(encrypted);

            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] ciphertext = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(combined, GCM_IV_LENGTH, ciphertext, 0, ciphertext.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, parameterSpec);

            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Decryption failed", e);
        }
    }

    /**
     * Derive a SecretKey from a string key.
     * The key must be at least 32 bytes (256 bits) for AES-256.
     *
     * @throws IllegalArgumentException if the key is null, empty, or shorter than 32 characters
     */
    public static SecretKey deriveKey(String keyString) {
        if (keyString == null || keyString.isBlank()) {
            throw new IllegalArgumentException("Encryption key must not be null or blank");
        }
        byte[] inputBytes = keyString.getBytes(StandardCharsets.UTF_8);
        if (inputBytes.length < 32) {
            throw new IllegalArgumentException(
                    "Encryption key must be at least 32 bytes, got " + inputBytes.length);
        }
        byte[] keyBytes = new byte[32];
        System.arraycopy(inputBytes, 0, keyBytes, 0, 32);
        return new SecretKeySpec(keyBytes, "AES");
    }
}
