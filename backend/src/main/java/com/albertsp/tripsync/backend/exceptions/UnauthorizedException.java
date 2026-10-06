package com.albertsp.tripsync.backend.exceptions;

/** The caller is not authenticated or sent an invalid token (HTTP 401). */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
