package com.transmute.erp.accounting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** One line of the owner's simple cash and bank ledger. Balances are set by the service. */
@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {

    @Id
    private String id;

    @Column(nullable = false)
    private LocalDate entryDate;

    @Column(nullable = false)
    private String description;

    private String party;
    private String category;

    /** One of: in, out. */
    @Column(nullable = false)
    private String type;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal runningBalance;

    /** One of: AI Auto-posted, Bank Match, Manual, Cheque Cleared. */
    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDate getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDate entryDate) { this.entryDate = entryDate; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getParty() { return party; }
    public void setParty(String party) { this.party = party; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getRunningBalance() { return runningBalance; }
    public void setRunningBalance(BigDecimal runningBalance) { this.runningBalance = runningBalance; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
