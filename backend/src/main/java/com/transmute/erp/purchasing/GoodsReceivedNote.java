package com.transmute.erp.purchasing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/** Proof that stock arrived against a purchase order. */
@Entity
@Table(name = "goods_received_notes")
public class GoodsReceivedNote {

    @Id
    private String id;

    @Column(nullable = false)
    private String poId;

    private String supplierName;
    private LocalDate receivedDate;
    private String receivedBy;
    private String warehouse;

    /** One of: complete, short-delivery. */
    private String status;

    private String linkedInvoiceId;

    @Column(length = 2000)
    private String notes;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPoId() { return poId; }
    public void setPoId(String poId) { this.poId = poId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public LocalDate getReceivedDate() { return receivedDate; }
    public void setReceivedDate(LocalDate receivedDate) { this.receivedDate = receivedDate; }

    public String getReceivedBy() { return receivedBy; }
    public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }

    public String getWarehouse() { return warehouse; }
    public void setWarehouse(String warehouse) { this.warehouse = warehouse; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLinkedInvoiceId() { return linkedInvoiceId; }
    public void setLinkedInvoiceId(String linkedInvoiceId) { this.linkedInvoiceId = linkedInvoiceId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
