package com.transmute.erp.alerts;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AlertService {

    private static final Set<String> STATUSES = Set.of("open", "resolved", "dismissed");

    private final AnomalyAlertRepository alerts;
    private final AuditService audit;

    public AlertService(AnomalyAlertRepository alerts, AuditService audit) {
        this.alerts = alerts;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<AnomalyAlert> list(String status) {
        return status == null || status.isBlank()
                ? alerts.findAllByOrderByDetectedAtDesc()
                : alerts.findByStatusOrderByDetectedAtDesc(status);
    }

    /** Alerts are raised by the system; this lets an integration or the owner add one. */
    public AnomalyAlert raise(AnomalyAlert input) {
        input.setId(Ids.next("ALT"));
        input.setStatus("open");
        input.setDetectedAt(Instant.now());
        AnomalyAlert saved = alerts.save(input);
        audit.record("Alerts", "Raised alert: " + saved.getTitle(),
                saved.getWhyFlagged(), null, "System", "flagged");
        return saved;
    }

    /** Resolves or dismisses an alert, recording the decision in the audit log. */
    public AnomalyAlert setStatus(String id, String status) {
        if (!STATUSES.contains(status)) {
            throw new BadRequestException("status must be open, resolved or dismissed");
        }
        AnomalyAlert alert = alerts.findById(id).orElseThrow(() -> new NotFoundException("Alert", id));
        alert.setStatus(status);
        audit.record("Alerts",
                ("resolved".equals(status) ? "Resolved " : "Dismissed ") + alert.getCategory() + ": " + alert.getTitle(),
                "Owner reviewed the evidence and marked it " + status + ".", null, "Owner",
                "resolved".equals(status) ? "approved" : "rejected");
        return alert;
    }
}
