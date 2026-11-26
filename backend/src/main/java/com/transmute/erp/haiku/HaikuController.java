package com.transmute.erp.haiku;

import java.time.LocalDate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/haiku")
public class HaikuController {

    private final HaikuService service;

    public HaikuController(HaikuService service) {
        this.service = service;
    }

    /** Today's haiku, or the one for a given date (yyyy-MM-dd). */
    @GetMapping
    public HaikuService.DailyHaiku haiku(@RequestParam(required = false) LocalDate date) {
        return service.forDate(date == null ? LocalDate.now() : date);
    }
}
