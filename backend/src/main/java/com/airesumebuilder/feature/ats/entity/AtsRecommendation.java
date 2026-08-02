package com.airesumebuilder.feature.ats.entity;
import jakarta.persistence.*; import lombok.*;
@Entity @Table(name="ats_recommendations") @Getter @Setter @NoArgsConstructor
public class AtsRecommendation { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="ats_report_id",nullable=false) private AtsReport report; @Column(nullable=false,length=50) private String category; @Column(name="recommendation_text",nullable=false,columnDefinition="TEXT") private String recommendationText; }
