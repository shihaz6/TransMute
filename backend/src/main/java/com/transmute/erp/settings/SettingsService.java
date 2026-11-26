package com.transmute.erp.settings;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SettingsService {

    private static final Set<String> MODES = Set.of("auto-post", "always-review");

    private final ApprovalRuleRepository rules;
    private final AiAutomationSettingRepository aiSettings;
    private final AuditService audit;

    public SettingsService(ApprovalRuleRepository rules, AiAutomationSettingRepository aiSettings,
                           AuditService audit) {
        this.rules = rules;
        this.aiSettings = aiSettings;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<ApprovalRule> rules() {
        return rules.findAll();
    }

    public ApprovalRule addRule(ApprovalRule input) {
        input.setId(Ids.next("RULE"));
        input.setActive(true);
        ApprovalRule saved = rules.save(input);
        audit.record("Settings", "Added approval rule: " + saved.getName(),
                saved.getCondition(), null, "Owner", "approved");
        return saved;
    }

    public ApprovalRule setRuleActive(String id, boolean active) {
        ApprovalRule rule = rules.findById(id).orElseThrow(() -> new NotFoundException("Approval rule", id));
        rule.setActive(active);
        audit.record("Settings", (active ? "Enabled" : "Disabled") + " approval rule: " + rule.getName(),
                "Owner changed the rule.", null, "Owner", "approved");
        return rule;
    }

    @Transactional(readOnly = true)
    public List<AiAutomationSetting> aiSettings() {
        return aiSettings.findAll();
    }

    public AiAutomationSetting setAiMode(String id, String mode) {
        if (!MODES.contains(mode)) {
            throw new BadRequestException("mode must be auto-post or always-review");
        }
        AiAutomationSetting setting = aiSettings.findById(id)
                .orElseThrow(() -> new NotFoundException("AI setting", id));
        setting.setMode(mode);
        audit.record("Settings", "Set " + setting.getTask() + " to " + mode,
                "Owner changed AI automation.", null, "Owner", "approved");
        return setting;
    }
}
