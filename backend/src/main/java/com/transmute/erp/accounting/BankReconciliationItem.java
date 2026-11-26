package com.transmute.erp.accounting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** One line from a bank statement, with an optional suggested match. */
@Entity
@Table(name = "bank_reconciliation_items")
public class BankReconciliationItem {

    /** Suggested ledger or invoice match for a statement line. */
    public record AiSuggestion(String matchRef, String party, int confidence, String reason) {
    }

    @Id
    private String id;

    @Column(nullable = false)
    private LocalDate statementDate;

    @Column(nullable = false)
    private String bankDescription;

    /** One of: credit, debit. */
    @Column(nullable = false)
    private String type;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    /** One of: suggested, matched, unmatched. */
    @Column(nullable = false)
    private String status;

    @JdbcTypeCode(SqlTypes.JSON)
    private AiSuggestion aiSuggestion;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDate getStatementDate() { return statementDate; }
    public void setStatementDate(LocalDate statementDate) { this.statementDate = statementDate; }

    public String getBankDescription() { return bankDescription; }
    public void setBankDescription(String bankDescription) { this.bankDescription = bankDescription; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public AiSuggestion getAiSuggestion() { return aiSuggestion; }
    public void setAiSuggestion(AiSuggestion aiSuggestion) { this.aiSuggestion = aiSuggestion; }
}
