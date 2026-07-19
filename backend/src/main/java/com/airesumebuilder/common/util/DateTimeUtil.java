package com.airesumebuilder.common.util;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

public final class DateTimeUtil {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_INSTANT;

    private DateTimeUtil() {
    }

    public static String formatUtc(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC).format(FORMATTER);
    }
}
