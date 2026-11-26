package com.transmute.erp.inventory;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    /** Body for a stock movement. {@code location} is warehouse, shop or van. */
    public record StockAdjustment(@NotBlank String location, int delta, String reason) {
    }

    private final InventoryService service;

    public InventoryController(InventoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<InventoryItem> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public InventoryItem get(@PathVariable String id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryItem create(@Valid @RequestBody InventoryItem body) {
        return service.create(body);
    }

    @PutMapping("/{id}")
    public InventoryItem update(@PathVariable String id, @Valid @RequestBody InventoryItem body) {
        return service.update(id, body);
    }

    @PostMapping("/{id}/stock")
    public InventoryItem adjustStock(@PathVariable String id, @Valid @RequestBody StockAdjustment body) {
        return service.adjustStock(id, body.location(), body.delta(), body.reason());
    }
}
