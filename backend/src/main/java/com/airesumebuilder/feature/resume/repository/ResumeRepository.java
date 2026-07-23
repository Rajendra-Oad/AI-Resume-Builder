package com.airesumebuilder.feature.resume.repository;

import com.airesumebuilder.feature.resume.entity.Resume;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.Instant;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, Long> {
    Page<Resume> findByUserEmailAndDeletedAtIsNull(String email, Pageable pageable);

    Optional<Resume> findByIdAndUserEmailAndDeletedAtIsNull(Long id, String email);

    Page<Resume> findByUserEmailAndDeletedAtIsNotNullAndDeletedAtAfter(String email, Instant cutoff, Pageable pageable);

    Optional<Resume> findByIdAndUserEmailAndDeletedAtIsNotNull(Long id, String email);
}
