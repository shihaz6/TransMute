package com.transmute.erp.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

@Entity
@Table(name = "inventory_items")
public class InventoryItem {

    @Id
    private String id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String sku;

    @NotBlank
    @Column(nullable = false)
    private String name;

    private String category;
    private String unit;

    @PositiveOrZero private int warehouseStock;
    @PositiveOrZero private int shopStock;
    @PositiveOrZero private int vanStock;
    @PositiveOrZero private int reorderLevel;
    @PositiveOrZero private int dailyVelocity;

    @PositiveOrZero
    @Column(precision = 15, scale = 2)
    private BigDecimal unitCost = BigDecimal.ZERO;

    @PositiveOrZero
    @Column(precision = 15, scale = 2)
    private BigDecimal salePrice = BigDecimal.ZERO;

    private String preferredSupplierId;
    private String preferredSupplierName;

    public int totalStock() {
        return warehouseStock + shopStock + vanStock;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public int getWarehouseStock() { return warehouseStock; }
    public void setWarehouseStock(int warehouseStock) { this.warehouseStock = warehouseStock; }

    public int getShopStock() { return shopStock; }
    public void setShopStock(int shopStock) { this.shopStock = shopStock; }

    public int getVanStock() { return vanStock; }
    public void setVanStock(int vanStock) { this.vanStock = vanStock; }

    public int getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(int reorderLevel) { this.reorderLevel = reorderLevel; }

    public int getDailyVelocity() { return dailyVelocity; }
    public void setDailyVelocity(int dailyVelocity) { this.dailyVelocity = dailyVelocity; }

    public BigDecimal getUnitCost() { return unitCost; }
    public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }

    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }

    public String getPreferredSupplierId() { return preferredSupplierId; }
    public void setPreferredSupplierId(String preferredSupplierId) { this.preferredSupplierId = preferredSupplierId; }

    public String getPreferredSupplierName() { return preferredSupplierName; }
    public void setPreferredSupplierName(String preferredSupplierName) { this.preferredSupplierName = preferredSupplierName; }
}
