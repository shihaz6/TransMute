package com.transmute.erp.inventory;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InventoryService {

    private final InventoryItemRepository items;
    private final AuditService audit;

    public InventoryService(InventoryItemRepository items, AuditService audit) {
        this.items = items;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<InventoryItem> list() {
        return items.findAll(Sort.by("name"));
    }

    @Transactional(readOnly = true)
    public InventoryItem get(String id) {
        return items.findById(id).orElseThrow(() -> new NotFoundException("Inventory item", id));
    }

    public InventoryItem create(InventoryItem input) {
        if (items.existsBySku(input.getSku())) {
            throw new BadRequestException("SKU already exists: " + input.getSku());
        }
        input.setId(Ids.next("INV"));
        return items.save(input);
    }

    public InventoryItem update(String id, InventoryItem input) {
        InventoryItem existing = get(id);
        existing.setName(input.getName());
        existing.setCategory(input.getCategory());
        existing.setUnit(input.getUnit());
        existing.setReorderLevel(input.getReorderLevel());
        existing.setDailyVelocity(input.getDailyVelocity());
        existing.setUnitCost(input.getUnitCost());
        existing.setSalePrice(input.getSalePrice());
        existing.setPreferredSupplierId(input.getPreferredSupplierId());
        existing.setPreferredSupplierName(input.getPreferredSupplierName());
        return existing;
    }

    /**
     * Moves stock for one location by a signed quantity. Stock can never go negative.
     * Each adjustment is recorded in the audit log.
     */
    public InventoryItem adjustStock(String id, String location, int delta, String reason) {
        InventoryItem item = get(id);
        int current = switch (location) {
            case "warehouse" -> item.getWarehouseStock();
            case "shop" -> item.getShopStock();
            case "van" -> item.getVanStock();
            default -> throw new BadRequestException("Unknown location: " + location);
        };
        int next = current + delta;
        if (next < 0) {
            throw new BadRequestException("Stock cannot go below zero at " + location);
        }
        switch (location) {
            case "warehouse" -> item.setWarehouseStock(next);
            case "shop" -> item.setShopStock(next);
            default -> item.setVanStock(next);
        }
        audit.record("Inventory",
                "Adjusted " + item.getName() + " at " + location + " by " + delta,
                reason == null || reason.isBlank() ? "Manual stock adjustment" : reason,
                null, "Owner", "approved");
        return item;
    }
}
