package com.promptdev.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;

import static org.junit.jupiter.api.Assertions.*;

class EncryptionUtilTest {

    private static final String TEST_KEY = "TestEncryptionKey1234567890123456";

    @Test
    @DisplayName("Should encrypt and decrypt a string correctly")
    void shouldEncryptAndDecryptCorrectly() {
        SecretKey key = EncryptionUtil.deriveKey(TEST_KEY);
        String original = "github_pat_abc123_secret_token";

        String encrypted = EncryptionUtil.encrypt(original, key);
        String decrypted = EncryptionUtil.decrypt(encrypted, key);

        assertEquals(original, decrypted);
    }

    @Test
    @DisplayName("Encrypted text should differ from plaintext")
    void encryptedShouldDifferFromPlaintext() {
        SecretKey key = EncryptionUtil.deriveKey(TEST_KEY);
        String original = "mySecretPassword";

        String encrypted = EncryptionUtil.encrypt(original, key);

        assertNotEquals(original, encrypted);
    }

    @Test
    @DisplayName("Same plaintext should produce different ciphertexts (unique IV)")
    void samePlaintextShouldProduceDifferentCiphertexts() {
        SecretKey key = EncryptionUtil.deriveKey(TEST_KEY);
        String original = "same-token-value";

        String encrypted1 = EncryptionUtil.encrypt(original, key);
        String encrypted2 = EncryptionUtil.encrypt(original, key);

        assertNotEquals(encrypted1, encrypted2, "Each encryption should produce unique output due to random IV");

        // But both should decrypt to the same value
        assertEquals(original, EncryptionUtil.decrypt(encrypted1, key));
        assertEquals(original, EncryptionUtil.decrypt(encrypted2, key));
    }

    @Test
    @DisplayName("Decryption with wrong key should fail")
    void decryptionWithWrongKeyShouldFail() {
        SecretKey correctKey = EncryptionUtil.deriveKey(TEST_KEY);
        SecretKey wrongKey = EncryptionUtil.deriveKey("WrongKeyForTesting000000000000000");

        String encrypted = EncryptionUtil.encrypt("my-token", correctKey);

        assertThrows(IllegalStateException.class, () -> {
            EncryptionUtil.decrypt(encrypted, wrongKey);
        });
    }

    @Test
    @DisplayName("Should handle empty string")
    void shouldHandleEmptyString() {
        SecretKey key = EncryptionUtil.deriveKey(TEST_KEY);
        String original = "";

        String encrypted = EncryptionUtil.encrypt(original, key);
        String decrypted = EncryptionUtil.decrypt(encrypted, key);

        assertEquals(original, decrypted);
    }

    @Test
    @DisplayName("Should handle long strings")
    void shouldHandleLongStrings() {
        SecretKey key = EncryptionUtil.deriveKey(TEST_KEY);
        String original = "x".repeat(10000);

        String encrypted = EncryptionUtil.encrypt(original, key);
        String decrypted = EncryptionUtil.decrypt(encrypted, key);

        assertEquals(original, decrypted);
    }

    @Test
    @DisplayName("Should handle special characters")
    void shouldHandleSpecialCharacters() {
        SecretKey key = EncryptionUtil.deriveKey(TEST_KEY);
        String original = "github_pat_!@#$%^&*()_+{}|:<>?~`-=[]\\;',./日本語";

        String encrypted = EncryptionUtil.encrypt(original, key);
        String decrypted = EncryptionUtil.decrypt(encrypted, key);

        assertEquals(original, decrypted);
    }

    @Test
    @DisplayName("deriveKey should reject short keys")
    void deriveKeyShouldRejectShortKeys() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> EncryptionUtil.deriveKey("short"));
        assertTrue(ex.getMessage().contains("at least 32 bytes"));
    }
}
