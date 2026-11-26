package com.transmute.erp.accounting;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankReconciliationItemRepository extends JpaRepository<BankReconciliationItem, String> {

    List<BankReconciliationItem> findAllByOrderByStatementDateDesc();
}
