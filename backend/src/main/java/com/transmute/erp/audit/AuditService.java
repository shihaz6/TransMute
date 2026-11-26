package com.transmute.erp.audit;

import com.transmute.erp.common.Ids;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Writes the AI action log. Other modules call {@link #record} when they change data. */
@Service
public class AuditService {

    private final AuditEntryRepository entries;

    public AuditService(AuditEntryRepository entries) {
        this.entries = entries;
    }

    @Transactional
    public AuditEntry record(String module, String action, String reason,
                             Integer confidence, String approvedBy, String outcome) {
        AuditEntry entry = new AuditEntry();
        entry.setId(Ids.next("LOG"));
        entry.setTimestamp(Instant.now());
        entry.setModule(module);
        entry.setAction(action);
        entry.setReason(reason);
        entry.setConfidence(confidence);
        entry.setApprovedBy(approvedBy);
        entry.setOutcome(outcome);
        return entries.save(entry);
    }

    @Transactional(readOnly = true)
    public List<AuditEntry> list(String module) {
        return module == null || module.isBlank()
                ? entries.findAllByOrderByTimestampDesc()
                : entries.findByModuleOrderByTimestampDesc(module);
    }
}
