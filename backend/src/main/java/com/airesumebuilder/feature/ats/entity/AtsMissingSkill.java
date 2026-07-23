package com.airesumebuilder.feature.ats.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="ats_missing_skills") @Getter @Setter @NoArgsConstructor
public class AtsMissingSkill { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="ats_report_id",nullable=false) private AtsReport report; @Column(name="skill_name",nullable=false,length=255) private String skillName; @Lob @Column(name="suggested_action",columnDefinition="TEXT") private String suggestedAction; }
