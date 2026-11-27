package com.transmute.erp.collections;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import com.transmute.erp.customer.Customer;
import com.transmute.erp.customer.CustomerService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@Transactional
public class CollectionService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
    private static final List<String> TONES = List.of("friendly", "firm", "final");
    private static final int SEND_LOCK_STRIPES = 64;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CollectionService.class);

    private final CollectionItemRepository items;
    private final CustomerService customers;
    private final AuditService audit;
    private final ReminderMailer mailer;
    private final TransactionTemplate tx;
    // Striped locks held by markSent across the status check, the email and the commit.
    private final Object[] sendLocks = Stream.generate(Object::new).limit(SEND_LOCK_STRIPES).toArray();

    public CollectionService(CollectionItemRepository items, CustomerService customers, AuditService audit,
                             ReminderMailer mailer, PlatformTransactionManager transactions) {
        this.items = items;
        this.customers = customers;
        this.audit = audit;
        this.mailer = mailer;
        this.tx = new TransactionTemplate(transactions);
    }

    @Transactional(readOnly = true)
    public List<CollectionItem> list() {
        return items.findAllByOrderByDaysOverdueDesc();
    }

    /**
     * Adds every overdue customer without an open collection item to the board, with a
     * reminder draft. Returns the number of items added.
     */
    public int syncFromCustomers() {
        int added = 0;
        for (Customer c : customers.list()) {
            if (c.getDaysOverdue() <= 0 || c.getOutstandingBalance().signum() <= 0) {
                continue;
            }
            if (items.existsByCustomerIdAndStatusNot(c.getId(), "sent")
                    || items.existsByCustomerIdAndStatusIn(c.getId(), List.of("sent", "promised"))) {
                continue;
            }
            CollectionItem item = new CollectionItem();
            item.setId(Ids.next("COL"));
            item.setCustomerId(c.getId());
            item.setCustomerName(c.getName());
            item.setContactPerson(c.getContactPerson());
            item.setPhone(c.getPhone());
            item.setOverdueAmount(c.getOutstandingBalance());
            item.setDaysOverdue(c.getDaysOverdue());
            item.setStatus("scheduled");
            item.setScheduledFor("Awaiting owner approval");
            item.setTone(toneFor(c.getDaysOverdue()));
            item.setDraftMessage(draftFor(item.getTone(), item));
            items.save(item);
            added++;
        }
        if (added > 0) {
            audit.record("Collections", "Added " + added + " overdue account(s) to the collections board",
                    "Customers with an outstanding balance past due.", null, "Owner", "flagged");
        }
        return added;
    }

    public CollectionItem changeTone(String id, String tone) {
        CollectionItem item = get(id);
        requireTone(tone);
        item.setTone(tone);
        item.setDraftMessage(draftFor(tone, item));
        return item;
    }

    public CollectionItem updateDraft(String id, String message) {
        if (message == null || message.isBlank()) {
            throw new BadRequestException("The reminder message cannot be empty");
        }
        CollectionItem item = get(id);
        item.setDraftMessage(message);
        return item;
    }

    /**
     * Emails the approved reminder to the customer, then records it as sent. Fails without
     * changing anything if the customer has no email or the server's mail is not set up.
     * The status is re-read and the status change committed while holding a lock for this item,
     * so concurrent sends in this JVM email the customer once. The lock does not span server instances.
     * <p>
     * Ordering note: the email is sent inside the database transaction, before it commits. If the
     * commit fails after the email has gone out, the item stays unsent and a retry emails the customer
     * again. Sending after commit would avoid that but could leave a recorded "sent" with no email, so
     * the order is kept. The per-JVM lock also does not prevent duplicates across multiple server instances.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CollectionItem markSent(String id) {
        Object lock = sendLocks[Math.floorMod(id.hashCode(), SEND_LOCK_STRIPES)];
        synchronized (lock) {
            return tx.execute(status -> sendAndRecord(id));
        }
    }

    private CollectionItem sendAndRecord(String id) {
        CollectionItem item = get(id);
        if ("sent".equals(item.getStatus()) || "promised".equals(item.getStatus())) {
            throw new BadRequestException("This reminder has already been sent");
        }
        String to = customers.get(item.getCustomerId()).getEmail();
        if (to == null || to.isBlank()) {
            throw new BadRequestException("Add the customer's email address before sending this reminder");
        }
        if (!mailer.configured()) {
            throw new BadRequestException("Email is not set up on the server. Set MAIL_HOST and MAIL_FROM first.");
        }
        try {
            mailer.send(to.trim(), "Payment reminder from TransMute", item.getDraftMessage());
        } catch (MailException e) {
            log.warn("Reminder email for {} failed: {}", item.getId(), e.getMessage());
            throw new BadRequestException("The email could not be sent. Check the server's mail settings.");
        }
        item.setStatus("sent");
        item.setLastContacted(Instant.now());
        audit.record("Collections",
                "Emailed reminder to " + item.getCustomerName() + " (" + item.getOverdueAmount() + ")",
                "Owner approved the " + item.getTone() + " message; sent to the customer's email.",
                96, "Owner", "approved");
        return item;
    }

    public CollectionItem recordPromise(String id, BigDecimal amount, LocalDate date) {
        CollectionItem item = get(id);
        if (date == null) {
            throw new BadRequestException("A promise needs a date");
        }
        if (amount != null && amount.signum() < 0) {
            throw new BadRequestException("Promise amount cannot be negative");
        }
        BigDecimal promised = amount != null ? amount
                : item.getOverdueAmount().divide(BigDecimal.valueOf(2));
        if (promised.compareTo(item.getOverdueAmount()) > 0) {
            throw new BadRequestException("Promise amount cannot be more than the overdue amount");
        }
        item.setStatus("promised");
        item.setPromisedDate(date);
        item.setPromisedAmount(promised);
        item.setScheduledFor("Follow-up " + DATE.format(date));
        audit.record("Collections",
                "Promise to pay recorded for " + item.getCustomerName(),
                "Customer promised " + promised + " by " + DATE.format(date) + ".",
                null, "Owner", "approved");
        return item;
    }

    private CollectionItem get(String id) {
        return items.findById(id).orElseThrow(() -> new NotFoundException("Collection item", id));
    }

    private static void requireTone(String tone) {
        if (!TONES.contains(tone)) {
            throw new BadRequestException("tone must be friendly, firm or final");
        }
    }

    private static String toneFor(int daysOverdue) {
        if (daysOverdue >= 60) return "final";
        if (daysOverdue >= 30) return "firm";
        return "friendly";
    }

    private static String draftFor(String tone, CollectionItem item) {
        String refs = String.join(", ", item.getInvoiceRefs());
        String amount = item.getOverdueAmount().toPlainString();
        String who = item.getContactPerson() == null ? "" : " " + item.getContactPerson();
        return switch (tone) {
            case "final" -> "Dear" + who + ",\n\nFinal reminder before credit hold: " + amount
                    + " (" + refs + ") has been pending for " + item.getDaysOverdue()
                    + " days.\n\nPlease confirm a settlement date to avoid pausing deliveries.";
            case "firm" -> "Dear" + who + ",\n\nYour overdue balance of " + amount + " (" + refs
                    + ") is now " + item.getDaysOverdue() + " days overdue.\n\nPlease settle at least half today.";
            default -> "Hello" + who + ",\n\nA gentle reminder that " + amount + " (" + refs
                    + ") is now " + item.getDaysOverdue() + " days past the credit period.\n\nThank you.";
        };
    }
}
