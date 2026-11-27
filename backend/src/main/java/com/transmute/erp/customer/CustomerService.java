package com.transmute.erp.customer;

import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CustomerService {

    private final CustomerRepository customers;

    public CustomerService(CustomerRepository customers) {
        this.customers = customers;
    }

    @Transactional(readOnly = true)
    public List<Customer> list() {
        return customers.findAll(org.springframework.data.domain.Sort.by("name"));
    }

    @Transactional(readOnly = true)
    public Customer get(String id) {
        return customers.findById(id).orElseThrow(() -> new NotFoundException("Customer", id));
    }

    public Customer create(Customer input) {
        input.setId(Ids.next("CUST"));
        return customers.save(input);
    }

    public Customer update(String id, Customer input) {
        Customer existing = get(id);
        existing.setName(input.getName());
        existing.setContactPerson(input.getContactPerson());
        existing.setPhone(input.getPhone());
        existing.setEmail(input.getEmail());
        existing.setCity(input.getCity());
        existing.setCategory(input.getCategory());
        existing.setOutstandingBalance(input.getOutstandingBalance());
        existing.setCreditLimit(input.getCreditLimit());
        existing.setDaysOverdue(input.getDaysOverdue());
        existing.setRisk(input.getRisk());
        existing.setAvgPayDays(input.getAvgPayDays());
        existing.setLastOrderDate(input.getLastOrderDate());
        existing.setAiRiskNote(input.getAiRiskNote());
        return existing;
    }
}
