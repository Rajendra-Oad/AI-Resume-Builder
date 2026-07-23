package com.airesumebuilder.feature.pdf.repository;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PdfExportRepository {
    private final JdbcTemplate jdbc;

    public PdfExportRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public ResumeDocument resume(String email, long id) {
        return jdbc.query(
            "SELECT r.*,CONCAT_WS(' ',u.first_name,u.last_name) full_name,u.id owner_id " +
                "FROM resumes r JOIN users u ON u.id=r.user_id WHERE u.email=? AND r.id=? AND r.deleted_at IS NULL",
            this::document,
            email,
            id
        ).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Resume not found."));
    }

    public void record(ResumeDocument resume, String name, long size, String hash) {
        jdbc.update("INSERT INTO pdf_exports(user_id,resume_id,file_name,byte_size,content_sha256,created_at) VALUES (?,?,?,?,?,NOW(6))",
            resume.userId(), resume.id(), name, size, hash);
    }

    public List<Export> history(String email, long resumeId) {
        return jdbc.query(
            "SELECT p.id,p.resume_id,p.file_name,p.byte_size,p.content_sha256,p.created_at FROM pdf_exports p " +
                "JOIN users u ON u.id=p.user_id WHERE u.email=? AND p.resume_id=? ORDER BY p.created_at DESC",
            this::export,
            email,
            resumeId
        );
    }

    private ResumeDocument document(ResultSet r, int row) throws SQLException {
        return new ResumeDocument(r.getLong("id"),r.getLong("owner_id"),r.getString("title"),r.getString("summary"),r.getString("target_job_title"),r.getString("full_name"),r.getString("contact_email"),r.getString("phone"),r.getString("location"),r.getString("github_url"),r.getString("linkedin_url"),r.getString("skills_content"),r.getString("experience_content"),r.getString("projects_content"),r.getString("education_content"),r.getString("certifications_content"),r.getString("languages_content"),r.getString("font_family"),r.getBigDecimal("font_size"),r.getBigDecimal("line_spacing"),r.getInt("section_spacing"),r.getInt("page_margin"));
    }

    private Export export(ResultSet r, int row) throws SQLException {
        return new Export(r.getLong("id"),r.getLong("resume_id"),r.getString("file_name"),r.getLong("byte_size"),r.getString("content_sha256"),r.getTimestamp("created_at").toInstant());
    }

    public record ResumeDocument(long id,long userId,String title,String summary,String targetJobTitle,String fullName,String contactEmail,String phone,String location,String githubUrl,String linkedinUrl,String skills,String experience,String projects,String education,String certifications,String languages,String fontFamily,BigDecimal fontSize,BigDecimal lineSpacing,int sectionSpacing,int pageMargin) {
        public ResumeDocument(long id,long userId,String title,String summary,String targetJobTitle,String fullName) {
            this(id,userId,title,summary,targetJobTitle,fullName,null,null,null,null,null,null,null,null,null,null,null,"HELVETICA",new BigDecimal("10.5"),new BigDecimal("1.25"),12,42);
        }
    }
    public record Export(long id,long resumeId,String fileName,long byteSize,String sha256,Instant createdAt) {}
}
