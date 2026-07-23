package com.airesumebuilder.feature.auth.phone;

import com.airesumebuilder.common.exception.ValidationException;

public final class PhoneNumbers {
    private PhoneNumbers() {}
    public static String normalize(String raw) {
        String digits = raw == null ? "" : raw.replaceAll("[^0-9+]", "");
        if (digits.startsWith("+")) digits = digits.substring(1);
        if (digits.length() == 10) digits = "91" + digits;
        if (!digits.matches("91[6-9][0-9]{9}")) throw new ValidationException("Enter a valid Indian mobile number.");
        return "+" + digits;
    }
}
