package com.albertsp.tripsync.backend.exceptions;

/** A generation limit or cooldown was hit (HTTP 429). */
public class TooManyRequestsException extends RuntimeException {

    private final Long retryAfterSeconds;

    public TooManyRequestsException(String message) {
        this(message, null);
    }

    public TooManyRequestsException(String message, Long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    /** Seconds until the caller may retry, or null when waiting will not help (e.g. per-trip cap). */
    public Long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
