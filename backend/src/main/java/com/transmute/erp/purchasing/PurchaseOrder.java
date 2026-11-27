package com.transmute.erp.purchasing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Version;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "purchase_orders")
public class PurchaseOrder {

    /** One product line on a purchase order. */
    public record PoLine(
            String sku,
            String productName,
            String unit,
            int orderedQty,
            int receivedQty,
            int invoicedQty,
            BigDecimal unitCost) {
    }

    @Id
    private String id;

    @Version
    private Long version;

    @Column(nullable = false)
    private String supplierId;

    private String supplierName;

    @Column(nullable = false)
    private Instant createdAt;

    private LocalDate expectedDate;

    /** One of: draft, sent, partial-received, received, matched. */
    @Column(nullable = false)
    private String status;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal total = BigDecimal.ZERO;

    private String grnId;
    private String linkedInvoiceId;
    private boolean createdByAi;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<PoLine> lines = new ArrayList<>();

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSupplierId() { return supplierId; }
    public void setSupplierId(String supplierId) { this.supplierId = supplierId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public LocalDate getExpectedDate() { return expectedDate; }
    public void setExpectedDate(LocalDate expectedDate) { this.expectedDate = expectedDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public String getGrnId() { return grnId; }
    public void setGrnId(String grnId) { this.grnId = grnId; }

    public String getLinkedInvoiceId() { return linkedInvoiceId; }
    public void setLinkedInvoiceId(String linkedInvoiceId) { this.linkedInvoiceId = linkedInvoiceId; }

    public boolean isCreatedByAi() { return createdByAi; }
    public void setCreatedByAi(boolean createdByAi) { this.createdByAi = createdByAi; }

    public List<PoLine> getLines() { return lines; }
    public void setLines(List<PoLine> lines) { this.lines = lines; }
}
