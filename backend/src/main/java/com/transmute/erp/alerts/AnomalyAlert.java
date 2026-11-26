package com.transmute.erp.alerts;

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

/** An anomaly the system flagged, with the evidence behind it. */
@Entity
@Table(name = "anomaly_alerts")
public class AnomalyAlert {

    public record Evidence(String label, String value) {
    }

    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    /** One of: Duplicate Invoice, Unusual Amount, Bank Details Changed, Stock Shrinkage, Margin Drop. */
    @Column(nullable = false)
    private String category;

    /** One of: critical, warning, info. */
    @Column(nullable = false)
    private String severity;

    /** One of: open, resolved, dismissed. */
    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private Instant detectedAt;

    @Column(precision = 15, scale = 2)
    private BigDecimal amountImpact;

    @Column(length = 2000)
    private String summary;

    @Column(length = 2000)
    private String whyFlagged;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<Evidence> evidence = new ArrayList<>();

    private String linkedRoute;
    private String linkedEntityId;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getDetectedAt() { return detectedAt; }
    public void setDetectedAt(Instant detectedAt) { this.detectedAt = detectedAt; }

    public BigDecimal getAmountImpact() { return amountImpact; }
    public void setAmountImpact(BigDecimal amountImpact) { this.amountImpact = amountImpact; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getWhyFlagged() { return whyFlagged; }
    public void setWhyFlagged(String whyFlagged) { this.whyFlagged = whyFlagged; }

    public List<Evidence> getEvidence() { return evidence; }
    public void setEvidence(List<Evidence> evidence) { this.evidence = evidence; }

    public String getLinkedRoute() { return linkedRoute; }
    public void setLinkedRoute(String linkedRoute) { this.linkedRoute = linkedRoute; }

    public String getLinkedEntityId() { return linkedEntityId; }
    public void setLinkedEntityId(String linkedEntityId) { this.linkedEntityId = linkedEntityId; }
}
