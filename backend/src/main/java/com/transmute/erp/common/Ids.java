package com.transmute.erp.common;

import java.util.UUID;

/** Builds record IDs such as {@code SO-1a2b3c4d-...}, using a full random UUID so collisions are not realistic. */
public final class Ids {

    private Ids() {
    }

    public static String next(String prefix) {
        return prefix + "-" + UUID.randomUUID();
    }
}
