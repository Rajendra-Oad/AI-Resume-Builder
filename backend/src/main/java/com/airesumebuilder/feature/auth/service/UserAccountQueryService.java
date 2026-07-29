package com.airesumebuilder.feature.auth.service;

/**
 * Public, read-only boundary for features that need the authenticated user's
 * internal identifier without depending on the auth repository or entity.
 */
public interface UserAccountQueryService {

    Long requireIdByEmail(String email);
}
