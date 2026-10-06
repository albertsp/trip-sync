package com.albertsp.tripsync.backend.exceptions;

/** The caller is authenticated but not allowed to do this (HTTP 403). */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
