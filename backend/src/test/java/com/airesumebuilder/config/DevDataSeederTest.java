package com.airesumebuilder.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.airesumebuilder.feature.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

class DevDataSeederTest {
    @Test
    void rejectsShortPasswordBeforeWritingData() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        DevDataSeeder seeder = new DevDataSeeder(jdbc, users, encoder, "too-short");

        assertThatThrownBy(() -> seeder.run(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("DEV_SEED_PASSWORD");

        verifyNoInteractions(jdbc, users, encoder);
    }
}
