package com.albertsp.tripsync.backend.exceptions;

/** The model answered but the output is truncated, malformed or breaks a business rule (HTTP 502 after one retry). */
public class InvalidLlmOutputException extends RuntimeException {

    private final String rawOutput;

    public InvalidLlmOutputException(String message) {
        this(message, null, null);
    }

    public InvalidLlmOutputException(String message, String rawOutput, Throwable cause) {
        super(message, cause);
        this.rawOutput = rawOutput;
    }

    /** What the model returned, for server-side logs only. Never send it to the client. */
    public String getRawOutput() {
        return rawOutput;
    }
}
