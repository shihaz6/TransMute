package com.transmute.erp.customer;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService service;

    public CustomerController(CustomerService service) {
        this.service = service;
    }

    @GetMapping
    public List<Customer> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public Customer get(@PathVariable String id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Customer create(@Valid @RequestBody Customer body) {
        return service.create(body);
    }

    @PutMapping("/{id}")
    public Customer update(@PathVariable String id, @Valid @RequestBody Customer body) {
        return service.update(id, body);
    }

    @PatchMapping("/{id}")
    public Customer patch(@PathVariable String id, @RequestBody Map<String, Object> changes) {
        return service.patch(id, changes);
    }
}
