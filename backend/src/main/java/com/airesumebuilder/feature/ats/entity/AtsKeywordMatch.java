package com.airesumebuilder.feature.ats.entity;
import jakarta.persistence.*; import java.math.BigDecimal; import lombok.*;
@Entity @Table(name="ats_keyword_matches") @Getter @Setter @NoArgsConstructor
public class AtsKeywordMatch { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="ats_report_id",nullable=false) private AtsReport report; @Column(nullable=false,length=255) private String keyword; @Column(name="found_in_resume",nullable=false) private boolean foundInResume; @Column(name="importance_weight",precision=6,scale=3) private BigDecimal importanceWeight; }
