package com.transmute.erp.catalyst;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A message in the Catalyst chat. User messages get an AI reply from {@link CatalystService}.
 */
@Entity
@Table(name = "catalyst_messages")
public class CatalystMessage {

    @Id
    private String id;

    /** One of: user, ai. */
    @Column(nullable = false)
    private String sender;

    private String senderLabel;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(length = 4000)
    private String text;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getSenderLabel() { return senderLabel; }
    public void setSenderLabel(String senderLabel) { this.senderLabel = senderLabel; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
}
