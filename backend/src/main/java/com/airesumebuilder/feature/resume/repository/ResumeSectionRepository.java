package com.airesumebuilder.feature.resume.repository;

import com.airesumebuilder.feature.resume.entity.ResumeSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResumeSectionRepository extends JpaRepository<ResumeSection, Long> {
}
