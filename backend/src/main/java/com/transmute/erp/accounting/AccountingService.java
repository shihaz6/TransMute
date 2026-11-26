package com.transmute.erp.accounting;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccountingService {

    public record NewPayment(
            LocalDate paymentDate,
            String customerName,
            String method,
            BigDecimal amount,
            String reference,
            String chequeNumber,
            String chequeBank,
            LocalDate chequeDueDate,
            String invoiceRef) {
    }

    public record NewBankLine(LocalDate statementDate, String bankDescription, String type, BigDecimal amount) {
    }

    private static final List<String> METHODS = List.of("Cash", "Bank Transfer", "Cheque");

    private final LedgerEntryRepository ledger;
    private final PaymentRecordRepository payments;
    private final BankReconciliationItemRepository bankLines;
    private final AuditService audit;

    public AccountingService(LedgerEntryRepository ledger, PaymentRecordRepository payments,
                             BankReconciliationItemRepository bankLines, AuditService audit) {
        this.ledger = ledger;
        this.payments = payments;
        this.bankLines = bankLines;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<LedgerEntry> ledgerEntries() {
        return ledger.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<PaymentRecord> payments() {
        return payments.findAllByOrderByPaymentDateDesc();
    }

    @Transactional(readOnly = true)
    public List<BankReconciliationItem> bankLines() {
        return bankLines.findAllByOrderByStatementDateDesc();
    }

    /** Appends a ledger line and computes the running balance from the previous line. */
    public LedgerEntry postLedger(LocalDate date, String type, BigDecimal amount,
                                  String description, String party, String category, String source) {
        if (!"in".equals(type) && !"out".equals(type)) {
            throw new BadRequestException("Ledger type must be in or out");
        }
        if (amount == null || amount.signum() <= 0) {
            throw new BadRequestException("Ledger amount must be greater than zero");
        }
        BigDecimal previous = ledger.findFirstByOrderByCreatedAtDesc()
                .map(LedgerEntry::getRunningBalance)
                .orElse(BigDecimal.ZERO);
        LedgerEntry entry = new LedgerEntry();
        entry.setId(Ids.next("LDG"));
        entry.setEntryDate(date);
        entry.setDescription(description);
        entry.setParty(party);
        entry.setCategory(category);
        entry.setType(type);
        entry.setAmount(amount);
        entry.setRunningBalance("in".equals(type) ? previous.add(amount) : previous.subtract(amount));
        entry.setSource(source);
        entry.setCreatedAt(Instant.now());
        return ledger.save(entry);
    }

    public PaymentRecord recordPayment(NewPayment input) {
        if (!METHODS.contains(input.method())) {
            throw new BadRequestException("method must be Cash, Bank Transfer or Cheque");
        }
        if (input.amount() == null || input.amount().signum() <= 0) {
            throw new BadRequestException("Payment amount must be greater than zero");
        }
        boolean cheque = "Cheque".equals(input.method());
        if (cheque && (input.chequeNumber() == null || input.chequeNumber().isBlank())) {
            throw new BadRequestException("A cheque payment needs a cheque number");
        }

        PaymentRecord record = new PaymentRecord();
        record.setId(Ids.next("PAY"));
        record.setPaymentDate(input.paymentDate() == null ? LocalDate.now() : input.paymentDate());
        record.setCustomerName(input.customerName());
        record.setMethod(input.method());
        record.setAmount(input.amount());
        record.setReference(input.reference());
        record.setChequeNumber(input.chequeNumber());
        record.setChequeBank(input.chequeBank());
        record.setChequeDueDate(input.chequeDueDate());
        record.setInvoiceRef(input.invoiceRef());
        if (cheque) {
            record.setChequeStatus("received");
        } else {
            postLedger(record.getPaymentDate(), "in", input.amount(),
                    "Payment from " + input.customerName() + " (" + input.reference() + ")",
                    input.customerName(), "Sales Receipt", "Manual");
        }
        PaymentRecord saved = payments.save(record);
        audit.record("Accounting", "Recorded " + input.method() + " payment of " + input.amount()
                + " from " + input.customerName(), "Entered by owner.", null, "Owner", "approved");
        return saved;
    }

    /**
     * Moves a cheque along received → deposited → cleared or bounced. Clearing a cheque
     * posts the money to the ledger.
     */
    public PaymentRecord setChequeStatus(String id, String next) {
        PaymentRecord p = payments.findById(id).orElseThrow(() -> new NotFoundException("Payment", id));
        if (!"Cheque".equals(p.getMethod())) {
            throw new BadRequestException("Only cheque payments have a cheque status");
        }
        String current = p.getChequeStatus();
        boolean allowed = ("received".equals(current) && "deposited".equals(next))
                || ("deposited".equals(current) && ("cleared".equals(next) || "bounced".equals(next)));
        if (!allowed) {
            throw new BadRequestException("Cannot move cheque from " + current + " to " + next);
        }
        p.setChequeStatus(next);
        if ("cleared".equals(next)) {
            postLedger(LocalDate.now(), "in", p.getAmount(),
                    "Cheque cleared — CHQ-" + p.getChequeNumber() + " (" + p.getInvoiceRef() + ")",
                    p.getCustomerName(), "Sales Receipt", "Cheque Cleared");
        }
        audit.record("Accounting", "Cheque CHQ-" + p.getChequeNumber() + " marked " + next,
                "Owner updated the cheque status.", null, "Owner",
                "bounced".equals(next) ? "flagged" : "approved");
        return p;
    }

    /** Adds statement lines from a bank import. They start unmatched. */
    public List<BankReconciliationItem> importBankLines(List<NewBankLine> lines) {
        if (lines == null || lines.isEmpty()) {
            throw new BadRequestException("Send at least one statement line");
        }
        return lines.stream().map(line -> {
            if (!"credit".equals(line.type()) && !"debit".equals(line.type())) {
                throw new BadRequestException("Statement line type must be credit or debit");
            }
            BankReconciliationItem item = new BankReconciliationItem();
            item.setId(Ids.next("BNK"));
            item.setStatementDate(line.statementDate());
            item.setBankDescription(line.bankDescription());
            item.setType(line.type());
            item.setAmount(line.amount());
            item.setStatus("unmatched");
            return bankLines.save(item);
        }).toList();
    }

    /** Accepts the match on a statement line and posts it to the ledger. */
    public BankReconciliationItem acceptMatch(String id) {
        BankReconciliationItem line = bankLines.findById(id)
                .orElseThrow(() -> new NotFoundException("Bank statement line", id));
        if ("matched".equals(line.getStatus())) {
            throw new BadRequestException("This statement line is already reconciled");
        }
        line.setStatus("matched");
        postLedger(line.getStatementDate(), "credit".equals(line.getType()) ? "in" : "out",
                line.getAmount(), line.getBankDescription(), "Bank statement",
                "Bank Reconciliation", "Bank Match");
        audit.record("Accounting", "Reconciled bank line " + line.getAmount() + " (" + line.getBankDescription() + ")",
                line.getAiSuggestion() == null ? "Manual match approved by owner."
                        : line.getAiSuggestion().reason(),
                line.getAiSuggestion() == null ? null : line.getAiSuggestion().confidence(),
                "Owner", "approved");
        return line;
    }
}
