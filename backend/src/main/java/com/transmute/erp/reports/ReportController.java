package com.transmute.erp.reports;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/reports/receivables, /api/reports/stock or /api/reports/purchase-orders. */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/{kind}")
    public ReportView report(@PathVariable String kind) {
        return service.build(kind);
    }
}
