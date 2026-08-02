package com.airesumebuilder.feature.job.service;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobService {
    private final JobRepository repository;
    public JobService(JobRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public Page list(String email, int page, int size) {
        int boundedPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        return new Page(repository.list(email, boundedSize, boundedPage * boundedSize), boundedPage, boundedSize, repository.count(email));
    }
    @Transactional(readOnly = true) public Job get(String email, long id) { return repository.get(email, id); }
    @Transactional public Job create(String email, Request request) { return repository.create(email, request); }
    @Transactional public void delete(String email, long id) { repository.delete(email, id); }

    public record Request(@Size(max = 255) String title, @Size(max = 255) String companyName, @NotBlank String content, @Size(max = 100) String seniorityLevel) {}
    public record Job(long id, String title, String companyName, String content, String seniorityLevel, Instant createdAt) {}
    public record Page(List<Job> items, int page, int size, long total) {}
}

@Repository
class JobRepository {
    private final JdbcTemplate jdbc;
    JobRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    List<JobService.Job> list(String email, int limit, int offset) {
        return jdbc.query("SELECT d.* FROM job_descriptions d JOIN users u ON u.id=d.user_id WHERE u.email=? AND d.deleted_at IS NULL ORDER BY d.created_at DESC,d.id DESC LIMIT ? OFFSET ?", this::map, email, limit, offset);
    }
    long count(String email) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM job_descriptions d JOIN users u ON u.id=d.user_id WHERE u.email=? AND d.deleted_at IS NULL", Long.class, email);
        return count == null ? 0 : count;
    }
    JobService.Job get(String email, long id) {
        return jdbc.query("SELECT d.* FROM job_descriptions d JOIN users u ON u.id=d.user_id WHERE u.email=? AND d.id=? AND d.deleted_at IS NULL", this::map, email, id).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("Job description not found."));
    }
    JobService.Job create(String email, JobService.Request request) {
        List<Long> ids = jdbc.query("INSERT INTO job_descriptions(user_id,title,company_name,content,seniority_level,is_external,created_at,updated_at) SELECT id,?,?,?,?,FALSE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM users WHERE email=? AND deleted_at IS NULL RETURNING id", (result, row) -> result.getLong(1), request.title(), request.companyName(), request.content(), request.seniorityLevel(), email);
        Long id = ids.stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("User account not found."));
        return get(email, id);
    }
    void delete(String email, long id) {
        if (jdbc.update("UPDATE job_descriptions d SET deleted_at=CURRENT_TIMESTAMP FROM users u WHERE u.id=d.user_id AND u.email=? AND d.id=? AND d.deleted_at IS NULL", email, id) == 0) throw new ResourceNotFoundException("Job description not found.");
    }
    private JobService.Job map(ResultSet result, int row) throws SQLException {
        return new JobService.Job(result.getLong("id"), result.getString("title"), result.getString("company_name"), result.getString("content"), result.getString("seniority_level"), result.getTimestamp("created_at").toInstant());
    }
}
