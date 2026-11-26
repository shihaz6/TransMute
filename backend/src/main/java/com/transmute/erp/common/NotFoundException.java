package com.transmute.erp.common;

/** Thrown when a requested record does not exist. Mapped to HTTP 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String entity, String id) {
        super(entity + " not found: " + id);
    }
}
