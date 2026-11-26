package com.transmute.erp.accounting;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, String> {

    List<PaymentRecord> findAllByOrderByPaymentDateDesc();
}
