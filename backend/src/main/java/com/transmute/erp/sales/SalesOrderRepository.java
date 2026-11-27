package com.transmute.erp.sales;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, String> {

    List<SalesOrder> findAllByOrderByCreatedAtDesc();

    List<SalesOrder> findByCustomerIdAndStatus(String customerId, String status);
}
