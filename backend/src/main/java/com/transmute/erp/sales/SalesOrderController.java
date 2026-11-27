package com.transmute.erp.sales;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class SalesOrderController {

    private final SalesOrderService service;

    public SalesOrderController(SalesOrderService service) {
        this.service = service;
    }

    @GetMapping
    public List<SalesOrder> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public SalesOrder get(@PathVariable String id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SalesOrder create(@RequestBody SalesOrderService.NewOrder body) {
        return service.create(body);
    }

    @PutMapping("/{id}/items")
    public SalesOrder replaceItems(@PathVariable String id, @RequestBody List<SalesOrderService.LineInput> body) {
        return service.replaceQuoteItems(id, body);
    }

    /**
     * Converting a quote to an order checks each line against the catalogue price. priceOverride=true
     * accepts lines priced differently from the catalogue; the override is audited.
     */
    @PostMapping("/{id}/convert")
    public SalesOrder convert(@PathVariable String id,
                              @RequestParam(defaultValue = "false") boolean priceOverride) {
        return service.convertQuote(id, priceOverride);
    }

    /** creditOverride=true confirms an order held for the credit limit. The override is audited. */
    @PostMapping("/{id}/confirm")
    public SalesOrder confirm(@PathVariable String id,
                              @RequestParam(defaultValue = "false") boolean creditOverride) {
        return service.confirm(id, creditOverride);
    }
}
