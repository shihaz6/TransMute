package com.transmute.erp.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

/** An owner-defined rule that holds an action until a named approver signs off. */
@Entity
@Table(name = "approval_rules")
public class ApprovalRule {

    @Id
    private String id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @NotBlank
    @Column(nullable = false, length = 1000)
    private String condition;

    private String approver;
    private boolean active = true;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }

    public String getApprover() { return approver; }
    public void setApprover(String approver) { this.approver = approver; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
