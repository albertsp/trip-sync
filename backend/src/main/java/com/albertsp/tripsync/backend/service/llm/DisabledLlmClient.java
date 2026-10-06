package com.albertsp.tripsync.backend.service.llm;

import com.albertsp.tripsync.backend.exceptions.LlmUnavailableException;

/** Used when no provider is configured, so the backend starts without a key and never serves fake data by accident. */
public class DisabledLlmClient implements LlmClient {

    private final String reason;

    public DisabledLlmClient(String reason) {
        this.reason = reason;
    }

    @Override
    public LlmResult complete(String systemInstruction, String userContent, LlmSchema schema) {
        throw new LlmUnavailableException(reason);
    }

    @Override
    public boolean isEnabled() {
        return false;
    }

    @Override
    public String model() {
        return "disabled";
    }
}
