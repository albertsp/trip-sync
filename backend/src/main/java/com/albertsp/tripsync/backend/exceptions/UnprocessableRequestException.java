package com.albertsp.tripsync.backend.exceptions;

/** The request is well formed but cannot be processed yet (HTTP 422). */
public class UnprocessableRequestException extends RuntimeException {
    public UnprocessableRequestException(String message) {
        super(message);
    }
}
