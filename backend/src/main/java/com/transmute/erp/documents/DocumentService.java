package com.transmute.erp.documents;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class DocumentService {

    /** Fields a person can enter or correct. Null means "leave unchanged". */
    public record FieldUpdate(
            String supplier,
            String invoiceNumber,
            LocalDate invoiceDate,
            LocalDate dueDate,
            BigDecimal subtotal,
            BigDecimal tax,
            BigDecimal total,
            String supplierAddress,
            String supplierNtn) {
    }

    private static final String NEEDS_REVIEW = "needs-review";
    private static final String LINES_DO_NOT_ADD_UP = "Line amounts do not add up to the subtotal. Check the lines.";

    private final InboxDocumentRepository documents;
    private final AuditService audit;
    private final Path storageDir;
    private final InvoiceExtractor extractor;

    public DocumentService(InboxDocumentRepository documents, AuditService audit,
                           InvoiceExtractor extractor,
                           @Value("${transmute.storage.dir}") String storageDir) {
        this.documents = documents;
        this.audit = audit;
        this.extractor = extractor;
        this.storageDir = Path.of(storageDir).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<InboxDocument> list() {
        return documents.findAllByOrderByReceivedAtDesc();
    }

    @Transactional(readOnly = true)
    public InboxDocument get(String id) {
        return documents.findById(id).orElseThrow(() -> new NotFoundException("Document", id));
    }

    /**
     * Stores an uploaded file and creates an inbox record for it. The file type is taken from the
     * file's content, not from the client. If a vision model is configured, blank invoice fields are
     * filled from the image. The record always stays in needs-review.
     */
    public InboxDocument store(MultipartFile file, String channel) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Choose a file to upload");
        }
        String safeChannel = channel == null || channel.isBlank() ? "upload" : channel;
        if (!List.of("upload", "email", "whatsapp").contains(safeChannel)) {
            throw new BadRequestException("channel must be upload, email or whatsapp");
        }
        String contentType = detectContentType(file);
        if (contentType == null) {
            throw new BadRequestException("Upload a PDF or an image (PNG, JPEG, WEBP or GIF)");
        }
        String original = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        String id = Ids.next("DOC");
        Path target = storageDir.resolve(id + "-" + original.replaceAll("[^A-Za-z0-9._-]", "_"));
        try {
            Files.createDirectories(storageDir);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Could not store the uploaded file", e);
        }

        InboxDocument doc = new InboxDocument();
        doc.setId(id);
        doc.setFileName(original);
        doc.setStoredPath(target.toString());
        doc.setContentType(contentType);
        doc.setSizeBytes(file.getSize());
        doc.setChannel(safeChannel);
        doc.setReceivedAt(Instant.now());
        doc.setSender("Uploaded manually");
        doc.setStatus(NEEDS_REVIEW);
        doc.setPhoto(contentType.startsWith("image/"));
        doc.setFailureReason("Fields not read from the file. Enter the invoice fields manually.");
        InboxDocument saved = documents.save(doc);

        boolean read = extractor.extract(target, contentType)
                .map(fields -> applyExtracted(saved, fields))
                .orElse(false);
        audit.record("Documents", "Added document " + original + " to review",
                read ? "Fields read from the file. Check them before approving."
                        : "Stored from upload. Fields not read from the file.",
                null, "Owner", "flagged");
        return saved;
    }

    private static String detectContentType(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return UploadTypes.detect(in.readNBytes(UploadTypes.HEADER_BYTES));
        } catch (IOException e) {
            throw new IllegalStateException("Could not read the uploaded file", e);
        }
    }

    /**
     * Fills only the fields that are still blank, so anything a person typed is kept.
     * Returns true if at least one field was filled.
     */
    private boolean applyExtracted(InboxDocument doc, InvoiceExtractor.Extracted f) {
        boolean changed = false;
        if (blank(doc.getSupplier()) && notBlank(f.supplier())) { doc.setSupplier(f.supplier()); changed = true; }
        if (blank(doc.getInvoiceNumber()) && notBlank(f.invoiceNumber())) { doc.setInvoiceNumber(f.invoiceNumber()); changed = true; }
        if (blank(doc.getSupplierAddress()) && notBlank(f.supplierAddress())) { doc.setSupplierAddress(f.supplierAddress()); changed = true; }
        if (blank(doc.getSupplierNtn()) && notBlank(f.supplierNtn())) { doc.setSupplierNtn(f.supplierNtn()); changed = true; }
        if (doc.getInvoiceDate() == null) {
            LocalDate d = parseDate(f.invoiceDate());
            if (d != null) { doc.setInvoiceDate(d); changed = true; }
        }
        if (doc.getDueDate() == null) {
            LocalDate d = parseDate(f.dueDate());
            if (d != null) { doc.setDueDate(d); changed = true; }
        }
        if (doc.getSubtotal().signum() == 0) {
            BigDecimal v = parseAmount(f.subtotal());
            if (v != null) { doc.setSubtotal(v); changed = true; }
        }
        if (doc.getTax().signum() == 0) {
            BigDecimal v = parseAmount(f.tax());
            if (v != null) { doc.setTax(v); changed = true; }
        }
        if (doc.getTotal().signum() == 0) {
            BigDecimal v = parseAmount(f.total());
            if (v != null) { doc.setTotal(v); changed = true; }
        }
        boolean linesSet = false;
        boolean hasLines = doc.getLineItems() != null && !doc.getLineItems().isEmpty();
        if (!hasLines && f.lineItems() != null && !f.lineItems().isEmpty()) {
            List<InboxDocument.LineItem> items = InvoiceLines.from(f.lineItems());
            if (!items.isEmpty()) {
                doc.setLineItems(items);
                linesSet = true;
                changed = true;
            }
        }
        if (changed) {
            doc.setFailureReason("Fields read from the file. Check them before approving.");
        }
        if (linesSet && doc.getSubtotal().signum() > 0
                && !InvoiceLines.totalsAgree(doc.getLineItems(), doc.getSubtotal())) {
            doc.setFailureReason(LINES_DO_NOT_ADD_UP);
        }
        return changed;
    }

    private static LocalDate parseDate(String s) {
        try {
            return notBlank(s) ? LocalDate.parse(s.trim()) : null;
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Parses an amount read from the file. Negative amounts are ignored, not stored. */
    private static BigDecimal parseAmount(String s) {
        try {
            if (!notBlank(s)) {
                return null;
            }
            BigDecimal v = new BigDecimal(s.replace(",", "").trim());
            return v.signum() < 0 ? null : v;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static boolean blank(String s) {
        return !notBlank(s);
    }

    public InboxDocument updateFields(String id, FieldUpdate update) {
        InboxDocument doc = get(id);
        requireNeedsReview(doc, "Approved or rejected documents cannot be edited");
        requireNotNegative(update.subtotal(), update.tax(), update.total());
        if (update.supplier() != null) doc.setSupplier(update.supplier());
        if (update.invoiceNumber() != null) doc.setInvoiceNumber(update.invoiceNumber());
        if (update.invoiceDate() != null) doc.setInvoiceDate(update.invoiceDate());
        if (update.dueDate() != null) doc.setDueDate(update.dueDate());
        if (update.subtotal() != null) doc.setSubtotal(update.subtotal());
        if (update.tax() != null) doc.setTax(update.tax());
        if (update.total() != null) doc.setTotal(update.total());
        if (update.supplierAddress() != null) doc.setSupplierAddress(update.supplierAddress());
        if (update.supplierNtn() != null) doc.setSupplierNtn(update.supplierNtn());
        return doc;
    }

    /** Approves a document once the supplier, invoice number and total are filled in. */
    public InboxDocument approve(String id) {
        InboxDocument doc = get(id);
        requireNeedsReview(doc, "Only documents waiting for review can be approved");
        boolean complete = notBlank(doc.getSupplier()) && notBlank(doc.getInvoiceNumber())
                && doc.getTotal() != null && doc.getTotal().signum() > 0;
        if (!complete) {
            throw new BadRequestException("Enter the supplier, invoice number and total before approving");
        }
        doc.setStatus("approved");
        doc.setOverallConfidence(100);
        audit.record("Documents",
                "Approved invoice " + doc.getInvoiceNumber() + " from " + doc.getSupplier(),
                "Owner verified the invoice fields.", null, "Owner", "approved");
        return doc;
    }

    public InboxDocument reject(String id) {
        InboxDocument doc = get(id);
        requireNeedsReview(doc, "Only documents waiting for review can be rejected");
        doc.setStatus("rejected");
        audit.record("Documents", "Rejected document " + doc.getFileName(),
                "Owner rejected the document.", null, "Owner", "rejected");
        return doc;
    }

    /** Path of the stored file, for download. */
    @Transactional(readOnly = true)
    public Path fileOf(String id) {
        InboxDocument doc = get(id);
        Path path = Path.of(doc.getStoredPath());
        if (!Files.exists(path)) {
            throw new NotFoundException("File for document", id);
        }
        return path;
    }

    @Transactional(readOnly = true)
    public InboxDocument metadata(String id) {
        return get(id);
    }

    private static void requireNeedsReview(InboxDocument doc, String message) {
        if (!NEEDS_REVIEW.equals(doc.getStatus())) {
            throw new BadRequestException(message);
        }
    }

    private static void requireNotNegative(BigDecimal... amounts) {
        for (BigDecimal amount : amounts) {
            if (amount != null && amount.signum() < 0) {
                throw new BadRequestException("Subtotal, tax and total cannot be negative");
            }
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
