package com.airesumebuilder.feature.auth.phone;

import com.airesumebuilder.common.exception.ConflictException;
import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.user.repository.UserProfileRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PhoneVerificationService {
    private final UserRepository users; private final UserProfileRepository profiles; private final PhoneOtpRepository challenges;
    private final OtpDeliveryProvider delivery; private final PasswordEncoder encoder; private final SecureRandom random=new SecureRandom();
    private final Duration ttl; private final Duration cooldown;
    public PhoneVerificationService(UserRepository users,UserProfileRepository profiles,PhoneOtpRepository challenges,
        OtpDeliveryProvider delivery,PasswordEncoder encoder,@Value("${app.otp.ttl:PT5M}")Duration ttl,
        @Value("${app.otp.resend-cooldown:PT1M}")Duration cooldown){this.users=users;this.profiles=profiles;this.challenges=challenges;this.delivery=delivery;this.encoder=encoder;this.ttl=ttl;this.cooldown=cooldown;}

    @Transactional public Dispatch send(String email,String rawPhone){
        User user=user(email); String phone=PhoneNumbers.normalize(rawPhone);
        if(users.existsByPhone(phone)&&!phone.equals(user.getPhone())) throw new ConflictException("That phone number is already linked to an account.");
        challenges.findTopByUserIdAndVerifiedAtIsNullOrderByCreatedAtDesc(user.getId()).ifPresent(latest->{
            if(latest.getCreatedAt()!=null&&latest.getCreatedAt().plus(cooldown).isAfter(Instant.now())) throw new ValidationException("Wait one minute before requesting another code.");
        });
        String code=String.valueOf(100000+random.nextInt(900000)); PhoneOtpChallenge challenge=new PhoneOtpChallenge();
        challenge.setUser(user);challenge.setPhone(phone);challenge.setCodeHash(encoder.encode(code));challenge.setExpiresAt(Instant.now().plus(ttl));
        challenges.save(challenge); var result=delivery.send(phone,code);
        return new Dispatch(mask(phone),ttl.toSeconds(),cooldown.toSeconds(),result.developmentCode());
    }

    @Transactional(noRollbackFor=ValidationException.class) public Verification verify(String email,String code){
        User user=user(email); PhoneOtpChallenge challenge=challenges.findTopByUserIdAndVerifiedAtIsNullOrderByCreatedAtDesc(user.getId())
            .orElseThrow(()->new ValidationException("Request a new verification code first."));
        if(challenge.getExpiresAt().isBefore(Instant.now())) throw new ValidationException("That code expired. Request a new one.");
        if(challenge.getAttempts()>=5) throw new ValidationException("Too many incorrect attempts. Request a new code.");
        if(!encoder.matches(code,challenge.getCodeHash())){challenge.setAttempts(challenge.getAttempts()+1);challenges.save(challenge);throw new ValidationException("The verification code is incorrect.");}
        Instant now=Instant.now();challenge.setVerifiedAt(now);user.setPhone(challenge.getPhone());user.setPhoneVerifiedAt(now);users.save(user);challenges.save(challenge);
        profiles.findByUserEmailAndUserDeletedAtIsNull(email).ifPresent(profile->{profile.setPhone(challenge.getPhone());profiles.save(profile);});
        return new Verification(challenge.getPhone(),true);
    }
    private User user(String email){return users.findByEmailAndDeletedAtIsNull(email).orElseThrow(()->new ResourceNotFoundException("User account not found."));}
    private String mask(String phone){return phone.substring(0,3)+"******"+phone.substring(phone.length()-4);}
    public record Dispatch(String destination,long expiresInSeconds,long retryAfterSeconds,String developmentCode){}
    public record Verification(String phone,boolean verified){}
}
