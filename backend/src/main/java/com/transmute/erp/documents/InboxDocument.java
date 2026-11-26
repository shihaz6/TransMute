package com.transmute.erp.documents;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A supplier document in the review inbox. Uploaded files are stored on disk; the fields
 * below are filled in by a person (or a future extraction step), never guessed.
 */
@Entity
@Table(name = "inbox_documents")
public class InboxDocument {

    /** One extracted line on the invoice. */
    public record LineItem(
            String id,
            String description,
            String sku,
            int qty,
            String unit,
            BigDecimal rate,
            BigDecimal amount,
            int confidence,
            String note) {
    }

    /** Result of comparing the invoice with its purchase order and goods receipt. */
    public record ThreeWayMatch(
            String status,
            String poNumber,
            String grnNumber,
            String summary,
            BigDecimal poTotal,
            boolean grnQtyMatched,
            BigDecimal varianceAmount) {
    }

    @Id
    private String id;

    @Column(nullable = false)
    private String fileName;

    /** Server-side path of the stored file. Never returned to clients. */
    @Column(nullable = false)
    private String storedPath;

    private String contentType;
    private long sizeBytes;

    /** One of: Supplier Invoice, Credit Note, Delivery Challan. */
    private String docType = "Supplier Invoice";

    /** One of: email, whatsapp, upload. */
    @Column(nullable = false)
    private String channel;

    @Column(nullable = false)
    private Instant receivedAt;

    private String sender;

    /** One of: auto-posted, needs-review, failed, approved, rejected. */
    @Column(nullable = false)
    private String status;

    private int overallConfidence;
    private boolean photo;
    private String failureReason;

    private String supplier;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private LocalDate dueDate;

    @Column(precision = 15, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    private BigDecimal tax = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<LineItem> lineItems = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    private ThreeWayMatch threeWayMatch;

    @Column(length = 2000)
    private String rawNotes;

    private String supplierAddress;
    private String supplierNtn;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    /** Not serialised: the storage path is internal. */
    String getStoredPath() { return storedPath; }
    void setStoredPath(String storedPath) { this.storedPath = storedPath; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(long sizeBytes) { this.sizeBytes = sizeBytes; }

    public String getDocType() { return docType; }
    public void setDocType(String docType) { this.docType = docType; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getOverallConfidence() { return overallConfidence; }
    public void setOverallConfidence(int overallConfidence) { this.overallConfidence = overallConfidence; }

    public boolean isPhoto() { return photo; }
    public void setPhoto(boolean photo) { this.photo = photo; }

    public String getFailureReason() { return failureReason; }
    public void setFailureReason(String failureReason) { this.failureReason = failureReason; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getTax() { return tax; }
    public void setTax(BigDecimal tax) { this.tax = tax; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public List<LineItem> getLineItems() { return lineItems; }
    public void setLineItems(List<LineItem> lineItems) { this.lineItems = lineItems; }

    public ThreeWayMatch getThreeWayMatch() { return threeWayMatch; }
    public void setThreeWayMatch(ThreeWayMatch threeWayMatch) { this.threeWayMatch = threeWayMatch; }

    public String getRawNotes() { return rawNotes; }
    public void setRawNotes(String rawNotes) { this.rawNotes = rawNotes; }

    public String getSupplierAddress() { return supplierAddress; }
    public void setSupplierAddress(String supplierAddress) { this.supplierAddress = supplierAddress; }

    public String getSupplierNtn() { return supplierNtn; }
    public void setSupplierNtn(String supplierNtn) { this.supplierNtn = supplierNtn; }
}
