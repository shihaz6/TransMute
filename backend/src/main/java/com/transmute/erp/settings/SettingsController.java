package com.transmute.erp.settings;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService service;

    public SettingsController(SettingsService service) {
        this.service = service;
    }

    @GetMapping("/approval-rules")
    public List<ApprovalRule> rules() {
        return service.rules();
    }

    @PostMapping("/approval-rules")
    @ResponseStatus(HttpStatus.CREATED)
    public ApprovalRule addRule(@RequestBody ApprovalRule body) {
        return service.addRule(body);
    }

    @PatchMapping("/approval-rules/{id}")
    public ApprovalRule setActive(@PathVariable String id, @RequestBody Map<String, Boolean> body) {
        return service.setRuleActive(id, Boolean.TRUE.equals(body.get("active")));
    }

    @GetMapping("/ai")
    public List<AiAutomationSetting> aiSettings() {
        return service.aiSettings();
    }

    @PatchMapping("/ai/{id}")
    public AiAutomationSetting setMode(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.setAiMode(id, body.get("mode"));
    }
}
