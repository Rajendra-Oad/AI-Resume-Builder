package com.airesumebuilder.feature.ai.service;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.ai.dto.request.AiSettingsRequest;
import com.airesumebuilder.feature.ai.dto.response.AiSettingsResponse;
import com.airesumebuilder.feature.ai.repository.AiUserSettingsRepository;
import com.airesumebuilder.feature.ai.repository.AiUserSettingsRepository.Credential;
import com.airesumebuilder.feature.ai.repository.AiUserSettingsRepository.Settings;
import com.airesumebuilder.feature.auth.service.UserAccountQueryService;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiUserSettingsService {
    private static final List<String> PROVIDERS = List.of("gemini", "openai");
    private final AiUserSettingsRepository settingsRepository;
    private final UserAccountQueryService userAccounts;
    private final byte[] encryptionKey;
    private final SecureRandom random = new SecureRandom();

    public AiUserSettingsService(
            AiUserSettingsRepository settingsRepository,
            UserAccountQueryService userAccounts,
            @Value("${app.ai.user-key-encryption-key:}") String encodedKey) {
        this.settingsRepository = settingsRepository;
        this.userAccounts = userAccounts;
        this.encryptionKey = decodeKey(encodedKey);
    }

    public AiSettingsResponse getForUser(String email) {
        return get(userAccounts.requireIdByEmail(email));
    }

    public AiSettingsResponse updateForUser(String email, AiSettingsRequest request) {
        return update(userAccounts.requireIdByEmail(email), request);
    }

    public AiSettingsResponse saveCredentialForUser(String email, String provider, String rawKey) {
        return saveCredential(userAccounts.requireIdByEmail(email), provider, rawKey);
    }

    public AiSettingsResponse deleteCredentialForUser(String email, String provider) {
        return deleteCredential(userAccounts.requireIdByEmail(email), provider);
    }

    @Transactional(readOnly = true)
    public AiSettingsResponse get(Long userId) {
        Settings settings = settingsRepository.settings(userId);
        List<AiSettingsResponse.ProviderCredentialStatus> credentials = PROVIDERS.stream().map(provider -> {
            java.util.Optional<Credential> credential = settingsRepository.credential(userId, provider);
            return new AiSettingsResponse.ProviderCredentialStatus(provider, credential.isPresent(), credential.map(Credential::hint).orElse(null));
        }).toList();
        return new AiSettingsResponse(settings.mode(), settings.provider(), settings.fallback(), credentials);
    }

    @Transactional
    public AiSettingsResponse update(Long userId, AiSettingsRequest request) {
        if ("BYOK".equals(request.mode()) && settingsRepository.credential(userId, request.preferredProvider()).isEmpty()) throw new ValidationException("Add a key for the selected provider before enabling BYOK mode.");
        settingsRepository.saveSettings(userId, request.mode(), request.preferredProvider(), request.allowPlatformFallback());
        return get(userId);
    }

    @Transactional
    public AiSettingsResponse saveCredential(Long userId, String provider, String rawKey) {
        validateProvider(provider); ensureEncryptionConfigured();
        String key = rawKey.trim(); byte[] iv = new byte[12]; random.nextBytes(iv); byte[] encrypted = encrypt(key, iv);
        String hint = "••••" + key.substring(Math.max(0, key.length()-4));
        settingsRepository.saveCredential(userId, provider, encrypted, iv, hint);
        return get(userId);
    }

    @Transactional
    public AiSettingsResponse deleteCredential(Long userId, String provider) {
        validateProvider(provider); settingsRepository.deleteCredential(userId, provider);
        Settings current=settingsRepository.settings(userId); if("BYOK".equals(current.mode())&&provider.equals(current.provider())) settingsRepository.resetToPlatform(userId);
        return get(userId);
    }

    @Transactional(readOnly = true)
    public Selection selection(Long userId) {
        Settings settings=settingsRepository.settings(userId);
        if(!"BYOK".equals(settings.mode())) return new Selection("PLATFORM",settings.provider(),null,false);
        String key=settingsRepository.credential(userId,settings.provider()).map(this::decrypt).orElseThrow(()->new ValidationException("The selected user API key is unavailable."));
        return new Selection("BYOK",settings.provider(),key,settings.fallback());
    }

    private byte[] encrypt(String raw,byte[] iv){try{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(encryptionKey,"AES"),new GCMParameterSpec(128,iv));return cipher.doFinal(raw.getBytes(StandardCharsets.UTF_8));}catch(Exception exception){throw new IllegalStateException("Could not protect the provider credential.",exception);}}
    private String decrypt(Credential value){ensureEncryptionConfigured();try{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(encryptionKey,"AES"),new GCMParameterSpec(128,value.iv()));return new String(cipher.doFinal(value.encrypted()),StandardCharsets.UTF_8);}catch(Exception exception){throw new IllegalStateException("Could not read the provider credential.",exception);}}
    private void validateProvider(String provider){if(!PROVIDERS.contains(provider))throw new ValidationException("Unsupported AI provider.");}
    private void ensureEncryptionConfigured(){if(encryptionKey.length!=32)throw new ValidationException("User API key encryption is not configured on this deployment.");}
    private byte[] decodeKey(String value){if(value==null||value.isBlank())return new byte[0];try{byte[] decoded=Base64.getDecoder().decode(value);return decoded.length==32?decoded:new byte[0];}catch(IllegalArgumentException ignored){return new byte[0];}}
    public record Selection(String mode,String provider,String apiKey,boolean allowPlatformFallback){}
}
