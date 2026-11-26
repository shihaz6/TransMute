package com.transmute.erp.alerts;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService service;

    public AlertController(AlertService service) {
        this.service = service;
    }

    @GetMapping
    public List<AnomalyAlert> list(@RequestParam(required = false) String status) {
        return service.list(status);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnomalyAlert raise(@RequestBody AnomalyAlert body) {
        return service.raise(body);
    }

    @PatchMapping("/{id}/status")
    public AnomalyAlert setStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.setStatus(id, body.get("status"));
    }
}
