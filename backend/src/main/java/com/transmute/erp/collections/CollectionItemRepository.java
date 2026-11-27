package com.transmute.erp.collections;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CollectionItemRepository extends JpaRepository<CollectionItem, String> {

    List<CollectionItem> findAllByOrderByDaysOverdueDesc();

    boolean existsByCustomerIdAndStatusNot(String customerId, String status);

    boolean existsByCustomerIdAndStatusIn(String customerId, List<String> statuses);
}
