package com.airesumebuilder.feature.user.service;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.entity.UserProfile;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.user.repository.UserProfileRepository;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {
    private final UserRepository users;
    private final UserProfileRepository profiles;
    public UserProfileService(UserRepository users, UserProfileRepository profiles) { this.users=users;this.profiles=profiles; }

    @Transactional(readOnly=true) public ProfileResponse get(String email) {
        User user=user(email); return profiles.findByUserEmailAndUserDeletedAtIsNull(email).map(p->response(user,p)).orElseGet(()->response(user,null));
    }
    @Transactional public ProfileResponse update(String email, ProfileRequest request) {
        User user=user(email); UserProfile profile=profiles.findByUserEmailAndUserDeletedAtIsNull(email).orElseGet(()->{UserProfile p=new UserProfile();p.setUser(user);return p;});
        user.setFirstName(request.firstName().trim()); user.setLastName(request.lastName().trim());
        profile.setDisplayName(blankToNull(request.displayName())); profile.setPhone(blankToNull(request.phone())); profile.setLocation(blankToNull(request.location()));
        users.save(user); return response(user,profiles.save(profile));
    }
    private User user(String email){return users.findByEmailAndDeletedAtIsNull(email).orElseThrow(()->new ResourceNotFoundException("User account not found."));}
    private ProfileResponse response(User u,UserProfile p){return new ProfileResponse(u.getId(),u.getFirstName(),u.getLastName(),u.getEmail(),u.getRole(),p==null?null:p.getDisplayName(),p==null?null:p.getPhone(),p==null?null:p.getLocation());}
    private String blankToNull(String value){return value==null||value.isBlank()?null:value.trim();}
    public record ProfileRequest(@NotBlank @Size(max=100) String firstName,@NotBlank @Size(max=100) String lastName,@Size(max=100) String displayName,@Size(max=50) String phone,@Size(max=255) String location){}
    public record ProfileResponse(Long id,String firstName,String lastName,@Email String email,String role,String displayName,String phone,String location){}
}
