package com.transmute.erp.purchasing;

import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository suppliers;

    public SupplierService(SupplierRepository suppliers) {
        this.suppliers = suppliers;
    }

    @Transactional(readOnly = true)
    public List<Supplier> list() {
        return suppliers.findAll(Sort.by("name"));
    }

    @Transactional(readOnly = true)
    public Supplier get(String id) {
        return suppliers.findById(id).orElseThrow(() -> new NotFoundException("Supplier", id));
    }

    public Supplier create(Supplier input) {
        input.setId(Ids.next("SUP"));
        return suppliers.save(input);
    }

    public Supplier update(String id, Supplier input) {
        Supplier existing = get(id);
        existing.setName(input.getName());
        existing.setCategory(input.getCategory());
        existing.setContactPerson(input.getContactPerson());
        existing.setPhone(input.getPhone());
        existing.setPaymentTerms(input.getPaymentTerms());
        // ytdSpend and priceHistory are server-owned and are not taken from the request.
        existing.setOnTimeRate(input.getOnTimeRate());
        existing.setBankAccountLast4(input.getBankAccountLast4());
        existing.setTrackedProduct(input.getTrackedProduct());
        existing.setPriceAlert(input.getPriceAlert());
        return existing;
    }
}
