package com.airesumebuilder.feature.auth.phone;

import com.airesumebuilder.feature.auth.entity.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="phone_otp_challenges")
public class PhoneOtpChallenge {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id",nullable=false) private User user;
    @Column(nullable=false,length=20) private String phone;
    @Column(name="code_hash",nullable=false,length=100) private String codeHash;
    @Column(nullable=false) private int attempts;
    @Column(name="expires_at",nullable=false) private Instant expiresAt;
    @Column(name="verified_at") private Instant verifiedAt;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @PrePersist void create(){createdAt=Instant.now();}
    public Long getId(){return id;} public User getUser(){return user;} public void setUser(User v){user=v;}
    public String getPhone(){return phone;} public void setPhone(String v){phone=v;}
    public String getCodeHash(){return codeHash;} public void setCodeHash(String v){codeHash=v;}
    public int getAttempts(){return attempts;} public void setAttempts(int v){attempts=v;}
    public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant v){expiresAt=v;}
    public Instant getVerifiedAt(){return verifiedAt;} public void setVerifiedAt(Instant v){verifiedAt=v;}
    public Instant getCreatedAt(){return createdAt;}
}
