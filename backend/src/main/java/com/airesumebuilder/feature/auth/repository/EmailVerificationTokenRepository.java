package com.airesumebuilder.feature.auth.repository;

import com.airesumebuilder.feature.auth.entity.EmailVerificationToken;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);
    List<EmailVerificationToken> findByUserIdAndUsedAtIsNull(Long userId);
}
