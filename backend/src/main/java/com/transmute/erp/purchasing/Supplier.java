package com.transmute.erp.purchasing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "suppliers")
public class Supplier {

    /** A detected change in a supplier's rate for one product. */
    public record PriceAlert(
            String productName,
            BigDecimal oldPrice,
            BigDecimal newPrice,
            BigDecimal percentChange,
            LocalDate detectedOn) {
    }

    /** One month of the supplier's invoiced rate against the market benchmark. */
    public record PricePoint(String month, BigDecimal price, BigDecimal marketAvg) {
    }

    @Id
    private String id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    private String category;
    private String contactPerson;
    private String phone;
    private String paymentTerms;

    @Column(precision = 15, scale = 2)
    private BigDecimal ytdSpend = BigDecimal.ZERO;

    private int onTimeRate;
    private String bankAccountLast4;
    private String trackedProduct;

    @JdbcTypeCode(SqlTypes.JSON)
    private PriceAlert priceAlert;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<PricePoint> priceHistory = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public BigDecimal getYtdSpend() { return ytdSpend; }
    public void setYtdSpend(BigDecimal ytdSpend) { this.ytdSpend = ytdSpend; }

    public int getOnTimeRate() { return onTimeRate; }
    public void setOnTimeRate(int onTimeRate) { this.onTimeRate = onTimeRate; }

    public String getBankAccountLast4() { return bankAccountLast4; }
    public void setBankAccountLast4(String bankAccountLast4) { this.bankAccountLast4 = bankAccountLast4; }

    public String getTrackedProduct() { return trackedProduct; }
    public void setTrackedProduct(String trackedProduct) { this.trackedProduct = trackedProduct; }

    public PriceAlert getPriceAlert() { return priceAlert; }
    public void setPriceAlert(PriceAlert priceAlert) { this.priceAlert = priceAlert; }

    public List<PricePoint> getPriceHistory() { return priceHistory; }
    public void setPriceHistory(List<PricePoint> priceHistory) { this.priceHistory = priceHistory; }
}
