package com.airesumebuilder.feature.ai.service;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.ai.dto.request.AiSettingsRequest;
import com.airesumebuilder.feature.ai.dto.response.AiSettingsResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiUserSettingsService {
    private static final List<String> PROVIDERS = List.of("gemini", "openai");
    private final JdbcTemplate jdbc;
    private final byte[] encryptionKey;
    private final SecureRandom random = new SecureRandom();

    public AiUserSettingsService(JdbcTemplate jdbc, @Value("${app.ai.user-key-encryption-key:}") String encodedKey) {
        this.jdbc = jdbc;
        this.encryptionKey = decodeKey(encodedKey);
    }

    public AiSettingsResponse get(Long userId) {
        Settings settings = settings(userId);
        List<AiSettingsResponse.ProviderCredentialStatus> credentials = PROVIDERS.stream().map(provider -> {
            List<String> hints = jdbc.query("SELECT key_hint FROM user_ai_provider_credentials WHERE user_id=? AND provider=?", (rs,row)->rs.getString(1), userId, provider);
            return new AiSettingsResponse.ProviderCredentialStatus(provider, !hints.isEmpty(), hints.isEmpty()?null:hints.getFirst());
        }).toList();
        return new AiSettingsResponse(settings.mode(), settings.provider(), settings.fallback(), credentials);
    }

    @Transactional
    public AiSettingsResponse update(Long userId, AiSettingsRequest request) {
        if ("BYOK".equals(request.mode()) && credential(userId, request.preferredProvider()).isEmpty()) throw new ValidationException("Add a key for the selected provider before enabling BYOK mode.");
        jdbc.update("INSERT INTO user_ai_settings (user_id,mode,preferred_provider,allow_platform_fallback,updated_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE mode=VALUES(mode),preferred_provider=VALUES(preferred_provider),allow_platform_fallback=VALUES(allow_platform_fallback),updated_at=VALUES(updated_at)", userId, request.mode(), request.preferredProvider(), request.allowPlatformFallback(), Instant.now());
        return get(userId);
    }

    @Transactional
    public AiSettingsResponse saveCredential(Long userId, String provider, String rawKey) {
        validateProvider(provider); ensureEncryptionConfigured();
        String key = rawKey.trim(); byte[] iv = new byte[12]; random.nextBytes(iv); byte[] encrypted = encrypt(key, iv);
        String hint = "••••" + key.substring(Math.max(0, key.length()-4));
        jdbc.update("INSERT INTO user_ai_provider_credentials (user_id,provider,encrypted_key,initialization_vector,key_version,key_hint,created_at,updated_at) VALUES (?,?,?,?,1,?,?,?) ON DUPLICATE KEY UPDATE encrypted_key=VALUES(encrypted_key),initialization_vector=VALUES(initialization_vector),key_version=VALUES(key_version),key_hint=VALUES(key_hint),updated_at=VALUES(updated_at)", userId, provider, encrypted, iv, hint, Instant.now(), Instant.now());
        return get(userId);
    }

    @Transactional
    public AiSettingsResponse deleteCredential(Long userId, String provider) {
        validateProvider(provider); jdbc.update("DELETE FROM user_ai_provider_credentials WHERE user_id=? AND provider=?", userId, provider);
        Settings current=settings(userId); if("BYOK".equals(current.mode())&&provider.equals(current.provider())) jdbc.update("UPDATE user_ai_settings SET mode='PLATFORM',updated_at=? WHERE user_id=?",Instant.now(),userId);
        return get(userId);
    }

    public Selection selection(Long userId) {
        Settings settings=settings(userId);
        if(!"BYOK".equals(settings.mode())) return new Selection("PLATFORM",settings.provider(),null,false);
        String key=credential(userId,settings.provider()).orElseThrow(()->new ValidationException("The selected user API key is unavailable."));
        return new Selection("BYOK",settings.provider(),key,settings.fallback());
    }

    private Settings settings(Long userId) {
        try{return jdbc.queryForObject("SELECT mode,preferred_provider,allow_platform_fallback FROM user_ai_settings WHERE user_id=?",(rs,row)->new Settings(rs.getString(1),rs.getString(2),rs.getBoolean(3)),userId);}catch(EmptyResultDataAccessException ignored){return new Settings("PLATFORM","gemini",true);}
    }
    private java.util.Optional<String> credential(Long userId,String provider){
        List<EncryptedCredential> rows=jdbc.query("SELECT encrypted_key,initialization_vector FROM user_ai_provider_credentials WHERE user_id=? AND provider=?",(rs,row)->new EncryptedCredential(rs.getBytes(1),rs.getBytes(2)),userId,provider);
        return rows.isEmpty()?java.util.Optional.empty():java.util.Optional.of(decrypt(rows.getFirst()));
    }
    private byte[] encrypt(String raw,byte[] iv){try{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(encryptionKey,"AES"),new GCMParameterSpec(128,iv));return cipher.doFinal(raw.getBytes(StandardCharsets.UTF_8));}catch(Exception exception){throw new IllegalStateException("Could not protect the provider credential.",exception);}}
    private String decrypt(EncryptedCredential value){ensureEncryptionConfigured();try{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(encryptionKey,"AES"),new GCMParameterSpec(128,value.iv()));return new String(cipher.doFinal(value.encrypted()),StandardCharsets.UTF_8);}catch(Exception exception){throw new IllegalStateException("Could not read the provider credential.",exception);}}
    private void validateProvider(String provider){if(!PROVIDERS.contains(provider))throw new ValidationException("Unsupported AI provider.");}
    private void ensureEncryptionConfigured(){if(encryptionKey.length!=32)throw new ValidationException("User API key encryption is not configured on this deployment.");}
    private byte[] decodeKey(String value){if(value==null||value.isBlank())return new byte[0];try{byte[] decoded=Base64.getDecoder().decode(value);return decoded.length==32?decoded:new byte[0];}catch(IllegalArgumentException ignored){return new byte[0];}}
    private record Settings(String mode,String provider,boolean fallback){}
    private record EncryptedCredential(byte[] encrypted,byte[] iv){}
    public record Selection(String mode,String provider,String apiKey,boolean allowPlatformFallback){}
}
