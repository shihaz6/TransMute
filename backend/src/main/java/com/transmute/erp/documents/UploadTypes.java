package com.transmute.erp.documents;

import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * Recognises uploaded files by their leading bytes. The client-supplied Content-Type is never
 * trusted, because whatever type is stored is later served back to the browser.
 */
final class UploadTypes {

    /** How many leading bytes are needed to recognise every accepted type. */
    static final int HEADER_BYTES = 12;

    static final String PDF = "application/pdf";
    static final String PNG = "image/png";
    static final String JPEG = "image/jpeg";
    static final String WEBP = "image/webp";
    static final String GIF = "image/gif";

    private static final Set<String> INLINE_TYPES = Set.of(PDF, PNG, JPEG, WEBP, GIF);

    private static final byte[] PDF_SIG = ascii("%PDF-");
    private static final byte[] PNG_SIG = {(byte) 0x89, 0x50, 0x4E, 0x47};
    private static final byte[] JPEG_SIG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] RIFF_SIG = ascii("RIFF");
    private static final byte[] WEBP_SIG = ascii("WEBP");
    private static final byte[] GIF87_SIG = ascii("GIF87a");
    private static final byte[] GIF89_SIG = ascii("GIF89a");

    private UploadTypes() {
    }

    /**
     * Returns the canonical MIME type for the given leading bytes, or null if the bytes are not
     * a PDF or one of the accepted image types.
     */
    static String detect(byte[] head) {
        if (head == null) {
            return null;
        }
        if (at(head, 0, PDF_SIG)) {
            return PDF;
        }
        if (at(head, 0, PNG_SIG)) {
            return PNG;
        }
        if (at(head, 0, JPEG_SIG)) {
            return JPEG;
        }
        if (at(head, 0, RIFF_SIG) && at(head, 8, WEBP_SIG)) {
            return WEBP;
        }
        if (at(head, 0, GIF87_SIG) || at(head, 0, GIF89_SIG)) {
            return GIF;
        }
        return null;
    }

    /** True for the canonical types that may be displayed inline (PDF and images). */
    static boolean isInline(String contentType) {
        return contentType != null && INLINE_TYPES.contains(contentType);
    }

    private static boolean at(byte[] head, int offset, byte[] signature) {
        if (head.length < offset + signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (head[offset + i] != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private static byte[] ascii(String s) {
        return s.getBytes(StandardCharsets.US_ASCII);
    }
}
