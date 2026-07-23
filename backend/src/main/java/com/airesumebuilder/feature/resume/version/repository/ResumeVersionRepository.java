package com.airesumebuilder.feature.resume.version.repository;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.resume.version.service.ResumeVersionService.VersionSummary;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ResumeVersionRepository {
    private final JdbcTemplate jdbc;

    public ResumeVersionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long create(long resumeId, String source, String label, String content) {
        // Serializing writers on the parent row makes MAX(version_number)+1 safe.
        jdbc.queryForObject("SELECT id FROM resumes WHERE id=? FOR UPDATE", Long.class, resumeId);
        int inserted = jdbc.update(
            "INSERT INTO resume_versions(resume_id,template_id,version_number,source_type,label,created_at) " +
                "SELECT r.id,r.template_id,COALESCE((SELECT MAX(v.version_number)+1 FROM resume_versions v WHERE v.resume_id=r.id),1),?,?,NOW(6) " +
                "FROM resumes r WHERE r.id=? AND r.deleted_at IS NULL",
            source,
            label,
            resumeId
        );
        if (inserted == 0) throw new ResourceNotFoundException("Resume not found.");
        Long versionId = jdbc.queryForObject(
            "SELECT id FROM resume_versions WHERE resume_id=? ORDER BY version_number DESC LIMIT 1",
            Long.class,
            resumeId
        );
        jdbc.update(
            "INSERT INTO resume_version_snapshots(resume_version_id,content,created_at) VALUES (?,CAST(? AS JSON),NOW(6))",
            versionId,
            content
        );
        return versionId;
    }

    public List<VersionSummary> list(String email, long resumeId, int limit, int offset) {
        return jdbc.query(
            "SELECT v.id,v.resume_id,v.version_number,v.source_type,v.label,v.created_at " +
                "FROM resume_versions v JOIN resumes r ON r.id=v.resume_id JOIN users u ON u.id=r.user_id " +
                "WHERE u.email=? AND u.deleted_at IS NULL AND r.id=? AND r.deleted_at IS NULL " +
                "ORDER BY v.version_number DESC LIMIT ? OFFSET ?",
            this::summary,
            email,
            resumeId,
            limit,
            offset
        );
    }

    public long count(String email, long resumeId) {
        Long count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM resume_versions v JOIN resumes r ON r.id=v.resume_id JOIN users u ON u.id=r.user_id " +
                "WHERE u.email=? AND u.deleted_at IS NULL AND r.id=? AND r.deleted_at IS NULL",
            Long.class,
            email,
            resumeId
        );
        return count == null ? 0 : count;
    }

    public VersionRecord get(String email, long resumeId, long versionId) {
        return jdbc.query(
            "SELECT v.id,v.resume_id,v.version_number,v.source_type,v.label,v.created_at,s.content " +
                "FROM resume_versions v JOIN resume_version_snapshots s ON s.resume_version_id=v.id " +
                "JOIN resumes r ON r.id=v.resume_id JOIN users u ON u.id=r.user_id " +
                "WHERE u.email=? AND u.deleted_at IS NULL AND r.id=? AND r.deleted_at IS NULL AND v.id=?",
            (result, row) -> new VersionRecord(summary(result, row), result.getString("content")),
            email,
            resumeId,
            versionId
        ).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Resume version not found."));
    }

    private VersionSummary summary(ResultSet result, int row) throws SQLException {
        return new VersionSummary(
            result.getLong("id"),
            result.getLong("resume_id"),
            result.getInt("version_number"),
            result.getString("source_type"),
            result.getString("label"),
            result.getTimestamp("created_at").toInstant()
        );
    }

    public record VersionRecord(VersionSummary summary, String content) {}
}
