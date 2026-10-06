package com.albertsp.tripsync.backend.exceptions;

/** The LLM provider is not configured, is down, rejected the request or rate limited us (HTTP 503). */
public class LlmUnavailableException extends RuntimeException {

    private final Long retryAfterSeconds;

    public LlmUnavailableException(String message) {
        this(message, null, null);
    }

    public LlmUnavailableException(String message, Long retryAfterSeconds, Throwable cause) {
        super(message, cause);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    /** Seconds the provider asked us to wait, or null when it did not say. */
    public Long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
