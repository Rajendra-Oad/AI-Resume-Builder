package com.airesumebuilder.feature.admin.service;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.admin.repository.AdminRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {
    private static final Set<String> ROLES = Set.of("USER", "ADMIN", "RECRUITER");
    private static final Set<String> STATUSES = Set.of("ACTIVE", "INACTIVE", "SUSPENDED");
    private final AdminRepository repository;

    public AdminService(AdminRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public UserPage users(int page, int size) {
        PageRequest request = pageRequest(page, size);
        return new UserPage(
            repository.users(request.size(), request.offset()),
            request.page(),
            request.size(),
            repository.userCount()
        );
    }

    @Transactional
    public UserView status(String adminEmail, long id, ChangeRequest request) {
        String value = normalized(request);
        if (!STATUSES.contains(value)) {
            throw new ValidationException("Status must be ACTIVE, INACTIVE, or SUSPENDED.");
        }
        guardSelf(adminEmail, id, value, "ACTIVE");
        return repository.update(adminEmail, id, "status", value, "USER_STATUS_CHANGED");
    }

    @Transactional
    public UserView role(String adminEmail, long id, ChangeRequest request) {
        String value = normalized(request);
        if (!ROLES.contains(value)) {
            throw new ValidationException("Role must be USER, ADMIN, or RECRUITER.");
        }
        guardSelf(adminEmail, id, value, "ADMIN");
        return repository.update(adminEmail, id, "role", value, "USER_ROLE_CHANGED");
    }

    @Transactional(readOnly = true)
    public ActionPage actions(int page, int size) {
        PageRequest request = pageRequest(page, size);
        return new ActionPage(
            repository.actions(request.size(), request.offset()),
            request.page(),
            request.size(),
            repository.actionCount()
        );
    }

    private void guardSelf(String adminEmail, long id, String value, String requiredValue) {
        if (repository.email(id).equalsIgnoreCase(adminEmail) && !value.equals(requiredValue)) {
            throw new ValidationException("Administrators cannot remove their own access.");
        }
    }

    private String normalized(ChangeRequest request) {
        String value = request == null ? null : request.value();
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private PageRequest pageRequest(int page, int size) {
        int boundedPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        return new PageRequest(boundedPage, boundedSize, boundedPage * boundedSize);
    }

    private record PageRequest(int page, int size, int offset) {}

    public record ChangeRequest(String value) {}
    public record UserView(long id, String firstName, String lastName, String email, String role, String status, Instant createdAt) {}
    public record UserPage(List<UserView> items, int page, int size, long total) {}
    public record ActionView(long id, long adminUserId, Long targetUserId, String action, String details, Instant createdAt) {}
    public record ActionPage(List<ActionView> items, int page, int size, long total) {}
}
