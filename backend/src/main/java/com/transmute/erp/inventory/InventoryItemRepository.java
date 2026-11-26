package com.transmute.erp.inventory;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, String> {

    boolean existsBySku(String sku);

    Optional<InventoryItem> findBySku(String sku);
}
