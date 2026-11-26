package com.transmute.erp.collections;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/collections")
public class CollectionController {

    /** Body for recording a promise to pay. Amount defaults to half the overdue balance. */
    public record Promise(BigDecimal amount, LocalDate date) {
    }

    private final CollectionService service;

    public CollectionController(CollectionService service) {
        this.service = service;
    }

    @GetMapping
    public List<CollectionItem> list() {
        return service.list();
    }

    @PostMapping("/sync")
    public Map<String, Integer> sync() {
        return Map.of("added", service.syncFromCustomers());
    }

    @PatchMapping("/{id}/tone")
    public CollectionItem changeTone(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.changeTone(id, body.get("tone"));
    }

    @PatchMapping("/{id}/draft")
    public CollectionItem updateDraft(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.updateDraft(id, body.get("message"));
    }

    @PostMapping("/{id}/send")
    public CollectionItem send(@PathVariable String id) {
        return service.markSent(id);
    }

    @PostMapping("/{id}/promise")
    public CollectionItem promise(@PathVariable String id, @RequestBody Promise body) {
        return service.recordPromise(id, body.amount(), body.date());
    }
}
