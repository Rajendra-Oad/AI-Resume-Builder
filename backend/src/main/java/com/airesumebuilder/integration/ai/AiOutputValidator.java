package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ExternalServiceException;
import org.springframework.stereotype.Component;

@Component
public class AiOutputValidator {
    public String validate(String output) {
        if (output == null || output.isBlank()) throw new ExternalServiceException("AI returned no usable content.");
        if (output.length() > 20000) throw new ExternalServiceException("AI output exceeded the permitted size.");
        return output.replace("\u0000", "").trim();
    }
}
