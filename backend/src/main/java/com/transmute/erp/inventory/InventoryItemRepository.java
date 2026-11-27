package com.transmute.erp.inventory;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, String> {

    boolean existsBySku(String sku);

    Optional<InventoryItem> findBySku(String sku);

    /** Loads the item by SKU with a row lock held until the surrounding transaction ends. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from InventoryItem i where i.sku = :sku")
    Optional<InventoryItem> findBySkuForUpdate(@Param("sku") String sku);

    /** Loads the item by id with a row lock held until the surrounding transaction ends. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from InventoryItem i where i.id = :id")
    Optional<InventoryItem> findByIdForUpdate(@Param("id") String id);
}
