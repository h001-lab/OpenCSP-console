package io.hlab.opencsp.infrastructure.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * AppConfig.value 를 DB 저장 전 AES-128-CBC 암호화 / 복호화하는 JPA Converter.
 * <p>
 * - APP_CONFIG_ENCRYPTION_KEY 환경변수로 16-byte 키를 지정한다.
 * - 미설정 시 기본 키를 사용하며, 프로덕션에서는 반드시 환경변수로 오버라이드해야 한다.
 * - null / 빈 문자열은 변환 없이 그대로 저장한다.
 * <p>
 * 저장 형태: Base64(IV + 암호문)
 */
@Slf4j
@Converter
@Component
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final int IV_LENGTH = 16;

    // 기본 키: 프로덕션에서는 APP_CONFIG_ENCRYPTION_KEY 로 반드시 교체
    private static final String DEFAULT_KEY = "opencsp-dev-key!"; // 16 bytes

    @Value("${app.config.encryption-key:" + DEFAULT_KEY + "}")
    private String encryptionKey;

    @Override
    public String convertToDatabaseColumn(String plainText) {
        if (plainText == null || plainText.isEmpty()) return plainText;
        try {
            byte[] iv = generateIv();
            Cipher cipher = buildCipher(Cipher.ENCRYPT_MODE, iv);
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            byte[] result = new byte[IV_LENGTH + encrypted.length];
            System.arraycopy(iv, 0, result, 0, IV_LENGTH);
            System.arraycopy(encrypted, 0, result, IV_LENGTH, encrypted.length);

            return Base64.getEncoder().encodeToString(result);
        } catch (Exception e) {
            log.error("Failed to encrypt config value", e);
            throw new IllegalStateException("Config encryption failed", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) return dbData;
        try {
            byte[] decoded = Base64.getDecoder().decode(dbData);
            byte[] iv = new byte[IV_LENGTH];
            byte[] encrypted = new byte[decoded.length - IV_LENGTH];
            System.arraycopy(decoded, 0, iv, 0, IV_LENGTH);
            System.arraycopy(decoded, IV_LENGTH, encrypted, 0, encrypted.length);

            Cipher cipher = buildCipher(Cipher.DECRYPT_MODE, iv);
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Failed to decrypt config value — returning raw value (may be unencrypted legacy data)", e);
            return dbData;
        }
    }

    private Cipher buildCipher(int mode, byte[] iv) throws Exception {
        byte[] keyBytes = encryptionKey.getBytes(StandardCharsets.UTF_8);
        // 키가 16바이트보다 길면 자르고, 짧으면 패딩
        byte[] key16 = new byte[16];
        System.arraycopy(keyBytes, 0, key16, 0, Math.min(keyBytes.length, 16));

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(mode, new SecretKeySpec(key16, "AES"), new IvParameterSpec(iv));
        return cipher;
    }

    private byte[] generateIv() {
        byte[] iv = new byte[IV_LENGTH];
        new java.security.SecureRandom().nextBytes(iv);
        return iv;
    }
}
