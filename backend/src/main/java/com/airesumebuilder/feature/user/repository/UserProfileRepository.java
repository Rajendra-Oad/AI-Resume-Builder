package com.airesumebuilder.feature.user.repository;

import com.airesumebuilder.feature.auth.entity.UserProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    Optional<UserProfile> findByUserEmailAndUserDeletedAtIsNull(String email);
}
