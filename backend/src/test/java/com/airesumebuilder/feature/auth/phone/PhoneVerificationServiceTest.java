package com.airesumebuilder.feature.auth.phone;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.user.repository.UserProfileRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PhoneVerificationServiceTest {
    @Mock UserRepository users; @Mock UserProfileRepository profiles; @Mock PhoneOtpRepository challenges;
    @Mock OtpDeliveryProvider delivery; @Mock PasswordEncoder encoder;
    PhoneVerificationService service; User user;
    @BeforeEach void setup(){service=new PhoneVerificationService(users,profiles,challenges,delivery,encoder,Duration.ofMinutes(5),Duration.ofMinutes(1));user=new User();user.setEmail("user@test.com");when(users.findByEmailAndDeletedAtIsNull("user@test.com")).thenReturn(Optional.of(user));}

    @Test void sendsHashedSixDigitCodeThroughConfiguredProvider(){
        when(challenges.findTopByUserIdAndVerifiedAtIsNullOrderByCreatedAtDesc(null)).thenReturn(Optional.empty());
        when(encoder.encode(anyString())).thenReturn("hashed");
        when(delivery.send(eq("+919876543210"),anyString())).thenAnswer(call->new OtpDeliveryProvider.DeliveryResult(call.getArgument(1)));
        var result=service.send("user@test.com","98765 43210");
        ArgumentCaptor<String> code=ArgumentCaptor.forClass(String.class);verify(delivery).send(eq("+919876543210"),code.capture());
        assertTrue(code.getValue().matches("[0-9]{6}"));assertEquals(code.getValue(),result.developmentCode());assertEquals(60,result.retryAfterSeconds());
        ArgumentCaptor<PhoneOtpChallenge> challenge=ArgumentCaptor.forClass(PhoneOtpChallenge.class);verify(challenges).save(challenge.capture());assertEquals("hashed",challenge.getValue().getCodeHash());
    }

    @Test void verifiesCodeOnceAndMarksPhoneVerified(){
        PhoneOtpChallenge challenge=new PhoneOtpChallenge();challenge.setUser(user);challenge.setPhone("+919876543210");challenge.setCodeHash("hashed");challenge.setExpiresAt(Instant.now().plusSeconds(60));
        when(challenges.findTopByUserIdAndVerifiedAtIsNullOrderByCreatedAtDesc(null)).thenReturn(Optional.of(challenge));when(encoder.matches("123456","hashed")).thenReturn(true);when(profiles.findByUserEmailAndUserDeletedAtIsNull("user@test.com")).thenReturn(Optional.empty());
        var result=service.verify("user@test.com","123456");
        assertTrue(result.verified());assertEquals("+919876543210",user.getPhone());assertNotNull(user.getPhoneVerifiedAt());assertNotNull(challenge.getVerifiedAt());verify(users).save(user);
    }
}
