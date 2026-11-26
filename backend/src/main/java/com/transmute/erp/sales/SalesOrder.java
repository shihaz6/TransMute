package com.transmute.erp.sales;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A sales order or quote. Line items and source message are stored as JSON columns. */
@Entity
@Table(name = "sales_orders")
public class SalesOrder {

    /** A line on the order. Stock levels are copied in when the line is created. */
    public record OrderLine(
            String id,
            String sku,
            String productName,
            int qty,
            String unit,
            BigDecimal unitPrice,
            int warehouseStock,
            int shopStock,
            int vanStock) {
    }

    /** The customer message the order was taken from (WhatsApp, email, phone). */
    public record OriginalMessage(
            String sender,
            String phoneOrEmail,
            Instant timestamp,
            String text,
            boolean voiceTranscript,
            String voiceDuration) {
    }

    /** Set when the order would take the customer over their credit limit. */
    public record CreditWarning(
            BigDecimal currentBalance,
            BigDecimal creditLimit,
            BigDecimal projectedBalance,
            String suggestion) {
    }

    @Id
    private String id;

    /** One of: order, quote. */
    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String customerId;

    private String customerName;

    /** One of: whatsapp, email, walk-in, phone. */
    private String source;

    @Column(nullable = false)
    private Instant createdAt;

    /** One of: draft, quote, pending-review, confirmed, invoiced, dispatched. */
    @Column(nullable = false)
    private String status;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal total = BigDecimal.ZERO;

    @JdbcTypeCode(SqlTypes.JSON)
    private OriginalMessage originalMessage;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<OrderLine> items = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    private CreditWarning creditWarning;

    private Integer aiConfidence;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public OriginalMessage getOriginalMessage() { return originalMessage; }
    public void setOriginalMessage(OriginalMessage originalMessage) { this.originalMessage = originalMessage; }

    public List<OrderLine> getItems() { return items; }
    public void setItems(List<OrderLine> items) { this.items = items; }

    public CreditWarning getCreditWarning() { return creditWarning; }
    public void setCreditWarning(CreditWarning creditWarning) { this.creditWarning = creditWarning; }

    public Integer getAiConfidence() { return aiConfidence; }
    public void setAiConfidence(Integer aiConfidence) { this.aiConfidence = aiConfidence; }
}
