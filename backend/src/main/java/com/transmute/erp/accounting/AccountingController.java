package com.transmute.erp.accounting;

import com.transmute.erp.accounting.AccountingService.NewBankLine;
import com.transmute.erp.accounting.AccountingService.NewPayment;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Ledger, payments and bank reconciliation for the accounting screen. */
@RestController
@RequestMapping("/api/accounting")
public class AccountingController {

    private final AccountingService service;

    public AccountingController(AccountingService service) {
        this.service = service;
    }

    @GetMapping("/ledger")
    public List<LedgerEntry> ledger() {
        return service.ledgerEntries();
    }

    @GetMapping("/payments")
    public List<PaymentRecord> payments() {
        return service.payments();
    }

    @PostMapping("/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentRecord recordPayment(@RequestBody NewPayment body) {
        return service.recordPayment(body);
    }

    @PatchMapping("/payments/{id}/cheque-status")
    public PaymentRecord chequeStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.setChequeStatus(id, body.get("status"));
    }

    @GetMapping("/bank-lines")
    public List<BankReconciliationItem> bankLines() {
        return service.bankLines();
    }

    @PostMapping("/bank-lines")
    @ResponseStatus(HttpStatus.CREATED)
    public List<BankReconciliationItem> importBankLines(@RequestBody List<NewBankLine> body) {
        return service.importBankLines(body);
    }

    @PostMapping("/bank-lines/{id}/accept")
    public BankReconciliationItem accept(@PathVariable String id) {
        return service.acceptMatch(id);
    }
}
