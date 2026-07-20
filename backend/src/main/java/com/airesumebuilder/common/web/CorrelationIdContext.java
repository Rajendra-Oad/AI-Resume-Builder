package com.airesumebuilder.common.web;

public final class CorrelationIdContext {
    private static final ThreadLocal<String> VALUE = new ThreadLocal<>();
    private CorrelationIdContext() {}
    public static String get() { return VALUE.get(); }
    public static void set(String value) { VALUE.set(value); }
    public static void clear() { VALUE.remove(); }
}
