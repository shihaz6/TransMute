package com.transmute.erp.customer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "customers")
public class Customer {

    @Id
    private String id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    private String contactPerson;
    private String phone;
    private String email;
    private String city;
    private String category;

    @PositiveOrZero
    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal outstandingBalance = BigDecimal.ZERO;

    @PositiveOrZero
    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal creditLimit = BigDecimal.ZERO;

    @PositiveOrZero
    private int daysOverdue;

    /** One of: low, watch, high. */
    private String risk = "low";

    @PositiveOrZero
    private int avgPayDays;

    private Instant lastOrderDate;

    @Column(length = 2000)
    private String aiRiskNote;

    /** Optimistic-lock version. Managed by JPA; concurrent updates of the same row fail instead of overwriting. */
    @Version
    private Long version;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getOutstandingBalance() { return outstandingBalance; }
    public void setOutstandingBalance(BigDecimal outstandingBalance) { this.outstandingBalance = outstandingBalance; }

    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }

    public int getDaysOverdue() { return daysOverdue; }
    public void setDaysOverdue(int daysOverdue) { this.daysOverdue = daysOverdue; }

    public String getRisk() { return risk; }
    public void setRisk(String risk) { this.risk = risk; }

    public int getAvgPayDays() { return avgPayDays; }
    public void setAvgPayDays(int avgPayDays) { this.avgPayDays = avgPayDays; }

    public Instant getLastOrderDate() { return lastOrderDate; }
    public void setLastOrderDate(Instant lastOrderDate) { this.lastOrderDate = lastOrderDate; }

    public String getAiRiskNote() { return aiRiskNote; }
    public void setAiRiskNote(String aiRiskNote) { this.aiRiskNote = aiRiskNote; }
}
