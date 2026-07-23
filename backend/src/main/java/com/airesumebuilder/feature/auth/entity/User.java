package com.airesumebuilder.feature.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(name = "uk_users_email", columnNames = "email")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false, length = 255)
    private String email;
    @Column(length = 20) private String phone;

    @Column(name = "password_hash", nullable = false, length = 500)
    private String passwordHash;

    @Column(nullable = false, length = 50)
    private String role = "USER";

    @Column(nullable = false, length = 50)
    private String status = "ACTIVE";
    @Column(length = 30) private String persona;
    @Column(name = "career_goal", length = 40) private String careerGoal;
    @Column(name = "onboarding_completed", nullable = false) private boolean onboardingCompleted;
    @Column(name = "failed_login_attempts", nullable = false) private int failedLoginAttempts;
    @Column(name = "locked_until") private Instant lockedUntil;
    @Column(name = "verified_at") private Instant verifiedAt;
    @Column(name = "phone_verified_at") private Instant phoneVerifiedAt;
    @Column(name = "last_login_at") private Instant lastLoginAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
    public String getPhone() { return phone; }
    public void setPhone(String value) { phone = value; }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
    public String getPersona() { return persona; }
    public void setPersona(String value) { persona = value; }
    public String getCareerGoal() { return careerGoal; }
    public void setCareerGoal(String value) { careerGoal = value; }
    public boolean isOnboardingCompleted() { return onboardingCompleted; }
    public void setOnboardingCompleted(boolean value) { onboardingCompleted = value; }
    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(int value) { failedLoginAttempts = value; }
    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant value) { lockedUntil = value; }
    public Instant getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(Instant value) { verifiedAt = value; }
    public Instant getPhoneVerifiedAt() { return phoneVerifiedAt; }
    public void setPhoneVerifiedAt(Instant value) { phoneVerifiedAt = value; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(Instant value) { lastLoginAt = value; }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }
}
