package com.transmute.erp.common;

/** Thrown when a request breaks a business rule. Mapped to HTTP 400. */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
