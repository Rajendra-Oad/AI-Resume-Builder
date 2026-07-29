package com.airesumebuilder.feature.auth.service.impl;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.auth.service.UserAccountQueryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserAccountQueryServiceImpl implements UserAccountQueryService {

    private final UserRepository userRepository;

    public UserAccountQueryServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Long requireIdByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(user -> user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User account not found."));
    }
}
