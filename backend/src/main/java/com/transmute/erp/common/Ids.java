package com.transmute.erp.common;

import java.util.UUID;

/** Builds readable record IDs such as {@code SO-1A2B3C4D}. */
public final class Ids {

    private Ids() {
    }

    public static String next(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
