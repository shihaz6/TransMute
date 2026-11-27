package com.transmute.erp.customer;

import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CustomerService {

    /** The only fields a partial update may touch. Balances and other fields are never patched. */
    private static final Set<String> PATCHABLE_FIELDS =
            Set.of("name", "contactPerson", "phone", "email", "city", "category");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

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

    /**
     * Partial update. Only keys present in {@code changes} are touched; a present key with a null
     * value clears that field. Balances and credit fields cannot be changed through this method.
     */
    public Customer patch(String id, Map<String, Object> changes) {
        Customer existing = get(id);
        for (String key : changes.keySet()) {
            if (!PATCHABLE_FIELDS.contains(key)) {
                throw new BadRequestException("Field " + key + " cannot be changed here");
            }
        }
        if (changes.containsKey("name")) {
            String name = asText(changes.get("name"), "name");
            if (name == null || name.isBlank()) {
                throw new BadRequestException("Name cannot be empty");
            }
        }
        if (changes.containsKey("email")) {
            String email = asText(changes.get("email"), "email");
            if (email != null && !email.isEmpty() && !EMAIL.matcher(email).matches()) {
                throw new BadRequestException("Enter a valid email address");
            }
        }

        if (changes.containsKey("name")) {
            existing.setName(asText(changes.get("name"), "name"));
        }
        if (changes.containsKey("contactPerson")) {
            existing.setContactPerson(asText(changes.get("contactPerson"), "contactPerson"));
        }
        if (changes.containsKey("phone")) {
            existing.setPhone(asText(changes.get("phone"), "phone"));
        }
        if (changes.containsKey("email")) {
            String email = asText(changes.get("email"), "email");
            existing.setEmail(email == null || email.isEmpty() ? null : email);
        }
        if (changes.containsKey("city")) {
            existing.setCity(asText(changes.get("city"), "city"));
        }
        if (changes.containsKey("category")) {
            existing.setCategory(asText(changes.get("category"), "category"));
        }
        return existing;
    }

    private static String asText(Object value, String field) {
        if (value == null || value instanceof String) {
            return (String) value;
        }
        throw new BadRequestException("Field " + field + " must be text");
    }
}
