package com.transmute.erp.purchasing;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService service;

    public PurchaseOrderController(PurchaseOrderService service) {
        this.service = service;
    }

    @GetMapping
    public List<PurchaseOrder> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public PurchaseOrder get(@PathVariable String id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseOrder create(@Valid @RequestBody PurchaseOrderService.NewPurchaseOrder body) {
        return service.create(body);
    }

    @PostMapping("/from-inventory/{itemId}")
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseOrder draftFromInventory(@PathVariable String itemId) {
        return service.draftFromInventory(itemId);
    }

    @PostMapping("/{id}/send")
    public PurchaseOrder send(@PathVariable String id) {
        return service.send(id);
    }

    @PostMapping("/{id}/receive")
    public PurchaseOrder receive(@PathVariable String id, @RequestBody PurchaseOrderService.Receipt body) {
        return service.receive(id, body);
    }
}
