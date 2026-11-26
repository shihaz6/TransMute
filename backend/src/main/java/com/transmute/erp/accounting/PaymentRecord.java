package com.transmute.erp.accounting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

/** A customer payment: cash, bank transfer or cheque. Cheques carry a status pipeline. */
@Entity
@Table(name = "payment_records")
public class PaymentRecord {

    @Id
    private String id;

    @Column(nullable = false)
    private LocalDate paymentDate;

    @Column(nullable = false)
    private String customerName;

    /** One of: Cash, Bank Transfer, Cheque. */
    @Column(nullable = false)
    private String method;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    private String reference;
    private String chequeNumber;
    private String chequeBank;
    private LocalDate chequeDueDate;

    /** One of: received, deposited, cleared, bounced. Null for non-cheque payments. */
    private String chequeStatus;

    private String invoiceRef;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getChequeNumber() { return chequeNumber; }
    public void setChequeNumber(String chequeNumber) { this.chequeNumber = chequeNumber; }

    public String getChequeBank() { return chequeBank; }
    public void setChequeBank(String chequeBank) { this.chequeBank = chequeBank; }

    public LocalDate getChequeDueDate() { return chequeDueDate; }
    public void setChequeDueDate(LocalDate chequeDueDate) { this.chequeDueDate = chequeDueDate; }

    public String getChequeStatus() { return chequeStatus; }
    public void setChequeStatus(String chequeStatus) { this.chequeStatus = chequeStatus; }

    public String getInvoiceRef() { return invoiceRef; }
    public void setInvoiceRef(String invoiceRef) { this.invoiceRef = invoiceRef; }
}
