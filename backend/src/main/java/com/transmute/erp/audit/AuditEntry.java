package com.transmute.erp.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** One line in the AI action log: what happened, why, and who approved it. */
@Entity
@Table(name = "audit_entries")
public class AuditEntry {

    @Id
    private String id;

    @Column(nullable = false)
    private Instant timestamp;

    /** Documents, Orders, Collections, Inventory, Accounting, Alerts, Catalyst, Purchasing, Customers. */
    @Column(nullable = false)
    private String module;

    @Column(nullable = false, length = 1000)
    private String action;

    @Column(length = 2000)
    private String reason;

    private Integer confidence;

    private String approvedBy;

    /** One of: auto-executed, approved, flagged, rejected. */
    private String outcome;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Integer getConfidence() { return confidence; }
    public void setConfidence(Integer confidence) { this.confidence = confidence; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }
}
