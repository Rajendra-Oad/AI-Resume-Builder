package com.airesumebuilder.feature.auth.phone;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhoneOtpRepository extends JpaRepository<PhoneOtpChallenge,Long> {
    Optional<PhoneOtpChallenge> findTopByUserIdAndVerifiedAtIsNullOrderByCreatedAtDesc(Long userId);
}
