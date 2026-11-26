package com.transmute.erp.catalyst;

import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalyst/messages")
public class CatalystController {

    private final CatalystMessageRepository messages;

    public CatalystController(CatalystMessageRepository messages) {
        this.messages = messages;
    }

    @GetMapping
    public List<CatalystMessage> list() {
        return messages.findAllByOrderByCreatedAtAsc();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CatalystMessage post(@RequestBody Map<String, String> body) {
        String text = body.get("text");
        if (text == null || text.isBlank()) {
            throw new BadRequestException("Message text cannot be empty");
        }
        CatalystMessage message = new CatalystMessage();
        message.setId(Ids.next("MSG"));
        message.setSender("user");
        message.setSenderLabel("Owner");
        message.setCreatedAt(Instant.now());
        message.setText(text.trim());
        return messages.save(message);
    }
}
