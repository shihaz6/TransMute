package com.transmute.erp.audit;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEntryRepository extends JpaRepository<AuditEntry, String> {

    List<AuditEntry> findByModuleOrderByTimestampDesc(String module);

    List<AuditEntry> findAllByOrderByTimestampDesc();
}
