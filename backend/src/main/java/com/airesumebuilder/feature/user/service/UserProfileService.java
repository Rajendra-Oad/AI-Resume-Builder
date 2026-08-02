package com.airesumebuilder.feature.user.service;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.entity.UserProfile;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.user.repository.UserProfileRepository;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Service
public class UserProfileService {
    private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;
    private static final Set<String> PHOTO_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private final UserRepository users;
    private final UserProfileRepository profiles;
    public UserProfileService(UserRepository users, UserProfileRepository profiles) { this.users=users;this.profiles=profiles; }

    @Transactional(readOnly=true) public ProfileResponse get(String email) {
        User user=user(email); return profiles.findByUserEmailAndUserDeletedAtIsNull(email).map(p->response(user,p)).orElseGet(()->response(user,null));
    }
    @Transactional public ProfileResponse update(String email, ProfileRequest request) {
        User user=user(email); UserProfile profile=profiles.findByUserEmailAndUserDeletedAtIsNull(email).orElseGet(()->{UserProfile p=new UserProfile();p.setUser(user);return p;});
        user.setFirstName(request.firstName().trim()); user.setLastName(request.lastName().trim());
        String requestedPhone=blankToNull(request.phone());
        user.setPhone(requestedPhone);
        profile.setDisplayName(blankToNull(request.displayName())); profile.setPhone(blankToNull(request.phone())); profile.setLocation(blankToNull(request.location()));
        users.save(user); return response(user,profiles.save(profile));
    }
    @Transactional public ProfileResponse completeOnboarding(String email, OnboardingRequest request) {
        User user = user(email);
        user.setPersona(request.persona());
        user.setCareerGoal(request.careerGoal());
        user.setOnboardingCompleted(true);
        return response(users.save(user), profiles.findByUserEmailAndUserDeletedAtIsNull(email).orElse(null));
    }
    @Transactional public ProfileResponse savePhoto(String email, MultipartFile photo) {
        if (photo == null || photo.isEmpty()) throw new com.airesumebuilder.common.exception.ValidationException("Choose a profile photo to upload.");
        if (photo.getSize() > MAX_PHOTO_BYTES) throw new com.airesumebuilder.common.exception.ValidationException("Profile photos must be 5 MB or smaller.");
        if (!PHOTO_TYPES.contains(photo.getContentType())) throw new com.airesumebuilder.common.exception.ValidationException("Profile photos must be JPEG, PNG, or WebP.");
        User user = user(email);
        UserProfile profile = profiles.findByUserEmailAndUserDeletedAtIsNull(email).orElseGet(() -> { UserProfile value=new UserProfile(); value.setUser(user); return value; });
        try { profile.setPhotoData(photo.getBytes()); } catch (IOException exception) { throw new IllegalStateException("Could not read the profile photo.", exception); }
        profile.setPhotoContentType(photo.getContentType());
        profile.setPhotoFileName(safeFileName(photo.getOriginalFilename()));
        return response(user, profiles.save(profile));
    }
    @Transactional(readOnly=true) public ProfilePhoto photo(String email) {
        UserProfile profile=profiles.findByUserEmailAndUserDeletedAtIsNull(email).filter(value->value.getPhotoData()!=null).orElseThrow(()->new ResourceNotFoundException("Profile photo not found."));
        return new ProfilePhoto(profile.getPhotoData(),profile.getPhotoContentType(),profile.getPhotoFileName());
    }
    @Transactional public void deletePhoto(String email) {
        UserProfile profile=profiles.findByUserEmailAndUserDeletedAtIsNull(email).orElseThrow(()->new ResourceNotFoundException("Profile photo not found."));
        if(profile.getPhotoData()==null) throw new ResourceNotFoundException("Profile photo not found.");
        profile.setPhotoData(null);profile.setPhotoContentType(null);profile.setPhotoFileName(null);profiles.save(profile);
    }
    private User user(String email){return users.findByEmailAndDeletedAtIsNull(email).orElseThrow(()->new ResourceNotFoundException("User account not found."));}
    private ProfileResponse response(User u,UserProfile p){return new ProfileResponse(u.getPublicId(),u.getFirstName(),u.getLastName(),u.getEmail(),u.getRole(),p==null?null:p.getDisplayName(),p==null?u.getPhone():p.getPhone(),p==null?null:p.getLocation(),u.getPersona(),u.getCareerGoal(),u.isOnboardingCompleted(),p!=null&&p.getPhotoData()!=null?"/api/v1/users/me/photo":null);}
    private String blankToNull(String value){return value==null||value.isBlank()?null:value.trim();}
    private String safeFileName(String value){if(value==null||value.isBlank())return "profile-photo";return value.replaceAll("[\\r\\n\\\\/]","_").substring(0,Math.min(255,value.length()));}
    public record ProfileRequest(@NotBlank @Size(max=100) String firstName,@NotBlank @Size(max=100) String lastName,@Size(max=100) String displayName,@Size(max=50) String phone,@Size(max=255) String location){}
    public record OnboardingRequest(
        @NotBlank @Pattern(regexp="STUDENT|FRESHER|PROFESSIONAL|CAREER_SWITCHER", message="Choose a valid career stage.") String persona,
        @NotBlank @Pattern(regexp="FIRST_RESUME|IMPROVE_RESUME|TAILOR_FOR_JOB|EXPLORE_OPPORTUNITIES", message="Choose a valid career goal.") String careerGoal
    ){}
    public record ProfileResponse(UUID publicId,String firstName,String lastName,@Email String email,String role,String displayName,String phone,String location,String persona,String careerGoal,boolean onboardingCompleted,String photoUrl){}
    public record ProfilePhoto(byte[] content,String contentType,String fileName){}
}
