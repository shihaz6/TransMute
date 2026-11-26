package com.transmute.erp.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** How much the AI may do on its own for one task. */
@Entity
@Table(name = "ai_automation_settings")
public class AiAutomationSetting {

    @Id
    private String id;

    @Column(nullable = false)
    private String task;

    private String description;

    /** One of: auto-post, always-review. */
    @Column(nullable = false)
    private String mode;

    private String threshold;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTask() { return task; }
    public void setTask(String task) { this.task = task; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public String getThreshold() { return threshold; }
    public void setThreshold(String threshold) { this.threshold = threshold; }
}
