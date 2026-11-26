package com.transmute.erp.accounting;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, String> {

    Optional<LedgerEntry> findFirstByOrderByCreatedAtDesc();

    List<LedgerEntry> findAllByOrderByCreatedAtDesc();
}
