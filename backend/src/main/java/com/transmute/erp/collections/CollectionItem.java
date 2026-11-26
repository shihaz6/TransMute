package com.transmute.erp.collections;

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

/** One overdue account on the collections board, with its reminder draft. */
@Entity
@Table(name = "collection_items")
public class CollectionItem {

    @Id
    private String id;

    @Column(nullable = false)
    private String customerId;

    private String customerName;
    private String contactPerson;
    private String phone;

    @Column(precision = 15, scale = 2)
    private BigDecimal overdueAmount = BigDecimal.ZERO;

    private int daysOverdue;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> invoiceRefs = new ArrayList<>();

    /** One of: scheduled, sent, promised, escalated. */
    @Column(nullable = false)
    private String status;

    private String scheduledFor;
    private LocalDate promisedDate;
    private BigDecimal promisedAmount;
    private Instant lastContacted;

    /** One of: friendly, firm, final. */
    @Column(nullable = false)
    private String tone;

    @Column(length = 4000)
    private String draftMessage;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public BigDecimal getOverdueAmount() { return overdueAmount; }
    public void setOverdueAmount(BigDecimal overdueAmount) { this.overdueAmount = overdueAmount; }

    public int getDaysOverdue() { return daysOverdue; }
    public void setDaysOverdue(int daysOverdue) { this.daysOverdue = daysOverdue; }

    public List<String> getInvoiceRefs() { return invoiceRefs; }
    public void setInvoiceRefs(List<String> invoiceRefs) { this.invoiceRefs = invoiceRefs; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getScheduledFor() { return scheduledFor; }
    public void setScheduledFor(String scheduledFor) { this.scheduledFor = scheduledFor; }

    public LocalDate getPromisedDate() { return promisedDate; }
    public void setPromisedDate(LocalDate promisedDate) { this.promisedDate = promisedDate; }

    public BigDecimal getPromisedAmount() { return promisedAmount; }
    public void setPromisedAmount(BigDecimal promisedAmount) { this.promisedAmount = promisedAmount; }

    public Instant getLastContacted() { return lastContacted; }
    public void setLastContacted(Instant lastContacted) { this.lastContacted = lastContacted; }

    public String getTone() { return tone; }
    public void setTone(String tone) { this.tone = tone; }

    public String getDraftMessage() { return draftMessage; }
    public void setDraftMessage(String draftMessage) { this.draftMessage = draftMessage; }
}
