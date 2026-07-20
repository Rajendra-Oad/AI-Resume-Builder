package com.airesumebuilder.common.dto;

import com.airesumebuilder.common.web.CorrelationIdContext;

public record ApiResponse<T>(boolean success, T data, ApiError error, ApiMeta meta, Pagination pagination) {
    public static <T> ApiResponse<T> success(T data, String ignoredMessage) {
        return new ApiResponse<>(true, data, null, ApiMeta.current(), null);
    }

    public static <T> ApiResponse<T> paginated(T data, Pagination pagination) {
        return new ApiResponse<>(true, data, null, ApiMeta.current(), pagination);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, new ApiError(code, message, null), ApiMeta.current(), null);
    }

    public static <T> ApiResponse<T> error(String message) {
        return error("INTERNAL_ERROR", message);
    }
}
