package com.transmute.erp.collections;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Sends collection reminders by email over SMTP. Sending is enabled only when a mail host
 * and a from-address are configured (see application.properties and the MAIL_* variables).
 */
@Component
public class ReminderMailer {

    private final ObjectProvider<JavaMailSender> sender;
    private final String host;
    private final String from;

    public ReminderMailer(ObjectProvider<JavaMailSender> sender,
                          @Value("${spring.mail.host:}") String host,
                          @Value("${transmute.mail.from:}") String from) {
        this.sender = sender;
        this.host = host == null ? "" : host.trim();
        this.from = from == null ? "" : from.trim();
    }

    public boolean configured() {
        return !host.isEmpty() && !from.isEmpty() && sender.getIfAvailable() != null;
    }

    /** Sends one reminder. Throws {@link MailException} if the server rejects it. */
    public void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        sender.getObject().send(message);
    }
}
