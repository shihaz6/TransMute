package com.transmute.erp.purchasing;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import com.transmute.erp.inventory.InventoryItem;
import com.transmute.erp.inventory.InventoryItemRepository;
import com.transmute.erp.purchasing.PurchaseOrder.PoLine;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PurchaseOrderService {

    public record NewPurchaseOrder(String supplierId, LocalDate expectedDate, List<PoLine> lines) {
    }

    public record ReceivedLine(String sku, int qty) {
    }

    public record Receipt(String receivedBy, String warehouse, String notes, List<ReceivedLine> lines) {
    }

    private final PurchaseOrderRepository orders;
    private final GoodsReceivedNoteRepository grns;
    private final SupplierService suppliers;
    private final InventoryItemRepository inventory;
    private final AuditService audit;

    public PurchaseOrderService(PurchaseOrderRepository orders, GoodsReceivedNoteRepository grns,
                                SupplierService suppliers, InventoryItemRepository inventory,
                                AuditService audit) {
        this.orders = orders;
        this.grns = grns;
        this.suppliers = suppliers;
        this.inventory = inventory;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrder> list() {
        return orders.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public PurchaseOrder get(String id) {
        return orders.findById(id).orElseThrow(() -> new NotFoundException("Purchase order", id));
    }

    public PurchaseOrder create(NewPurchaseOrder input) {
        if (input.lines() == null || input.lines().isEmpty()) {
            throw new BadRequestException("A purchase order needs at least one line");
        }
        Supplier supplier = suppliers.get(input.supplierId());
        PurchaseOrder po = new PurchaseOrder();
        po.setId(Ids.next("PO"));
        po.setSupplierId(supplier.getId());
        po.setSupplierName(supplier.getName());
        po.setCreatedAt(Instant.now());
        po.setExpectedDate(input.expectedDate());
        po.setStatus("draft");
        po.setLines(new ArrayList<>(input.lines()));
        po.setTotal(totalOf(input.lines()));
        PurchaseOrder saved = orders.save(po);
        audit.record("Purchasing", "Created purchase order " + saved.getId() + " for " + supplier.getName(),
                "Created manually.", null, "Owner", "approved");
        return saved;
    }

    /**
     * Drafts a reorder for an item from its preferred supplier. Quantity is twice the
     * reorder level, with a floor of 50 units.
     */
    public PurchaseOrder draftFromInventory(String itemId) {
        InventoryItem item = inventory.findById(itemId)
                .orElseThrow(() -> new NotFoundException("Inventory item", itemId));
        if (item.getPreferredSupplierId() == null) {
            throw new BadRequestException("No preferred supplier is set for " + item.getName());
        }
        int qty = Math.max(item.getReorderLevel() * 2, 50);
        PoLine line = new PoLine(item.getSku(), item.getName(), item.getUnit(), qty, 0, 0, item.getUnitCost());
        Supplier supplier = suppliers.get(item.getPreferredSupplierId());

        PurchaseOrder po = new PurchaseOrder();
        po.setId(Ids.next("PO"));
        po.setSupplierId(supplier.getId());
        po.setSupplierName(supplier.getName());
        po.setCreatedAt(Instant.now());
        po.setExpectedDate(LocalDate.now().plusDays(7));
        po.setStatus("draft");
        po.setLines(List.of(line));
        po.setTotal(totalOf(List.of(line)));
        po.setCreatedByAi(true);
        PurchaseOrder saved = orders.save(po);

        audit.record("Inventory",
                "Created draft PO " + saved.getId() + " for " + qty + " " + item.getUnit() + " of " + item.getName(),
                "Stock is at or below the reorder level.", 95, "Owner", "approved");
        return saved;
    }

    public PurchaseOrder send(String id) {
        PurchaseOrder po = get(id);
        if (!"draft".equals(po.getStatus())) {
            throw new BadRequestException("Only draft purchase orders can be sent");
        }
        po.setStatus("sent");
        return po;
    }

    /**
     * Records goods received against a purchase order. Every line is validated before any
     * stock moves, so a rejected receipt changes nothing. Received quantity is added to the
     * warehouse stock of the matching SKU.
     */
    public PurchaseOrder receive(String id, Receipt receipt) {
        PurchaseOrder po = get(id);
        if (!"sent".equals(po.getStatus()) && !"partial-received".equals(po.getStatus())) {
            throw new BadRequestException("Purchase order " + id + " is not open for receiving");
        }
        if (receipt.lines() == null || receipt.lines().isEmpty()) {
            throw new BadRequestException("Enter the quantity received for at least one line");
        }

        List<PoLine> updated = new ArrayList<>(po.getLines());
        for (ReceivedLine r : receipt.lines()) {
            int index = indexOfSku(updated, r.sku());
            if (index < 0) {
                throw new BadRequestException("SKU " + r.sku() + " is not on " + id);
            }
            PoLine line = updated.get(index);
            int outstanding = line.orderedQty() - line.receivedQty();
            if (r.qty() <= 0 || r.qty() > outstanding) {
                throw new BadRequestException("Received quantity for " + r.sku() + " must be between 1 and " + outstanding);
            }
            if (inventory.findBySku(r.sku()).isEmpty()) {
                throw new BadRequestException("No inventory item exists for SKU " + r.sku());
            }
            updated.set(index, new PoLine(line.sku(), line.productName(), line.unit(), line.orderedQty(),
                    line.receivedQty() + r.qty(), line.invoicedQty(), line.unitCost()));
        }

        for (ReceivedLine r : receipt.lines()) {
            InventoryItem item = inventory.findBySku(r.sku()).orElseThrow();
            item.setWarehouseStock(item.getWarehouseStock() + r.qty());
        }

        boolean complete = updated.stream().allMatch(l -> l.receivedQty() >= l.orderedQty());
        po.setLines(updated);
        po.setStatus(complete ? "received" : "partial-received");

        GoodsReceivedNote grn = new GoodsReceivedNote();
        grn.setId(Ids.next("GRN"));
        grn.setPoId(po.getId());
        grn.setSupplierName(po.getSupplierName());
        grn.setReceivedDate(LocalDate.now());
        grn.setReceivedBy(receipt.receivedBy());
        grn.setWarehouse(receipt.warehouse() == null || receipt.warehouse().isBlank() ? "Warehouse" : receipt.warehouse());
        grn.setStatus(complete ? "complete" : "short-delivery");
        grn.setNotes(receipt.notes());
        grns.save(grn);
        po.setGrnId(grn.getId());

        audit.record("Purchasing",
                "Received stock against " + id + " (" + grn.getId() + ")",
                complete ? "All lines received." : "Partial delivery; the rest is still outstanding.",
                null, receipt.receivedBy() == null ? "Owner" : receipt.receivedBy(), "approved");
        return po;
    }

    private static int indexOfSku(List<PoLine> lines, String sku) {
        for (int i = 0; i < lines.size(); i++) {
            if (lines.get(i).sku().equals(sku)) {
                return i;
            }
        }
        return -1;
    }

    private static BigDecimal totalOf(List<PoLine> lines) {
        return lines.stream()
                .map(l -> l.unitCost().multiply(BigDecimal.valueOf(l.orderedQty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
