package com.transmute.erp.catalyst;

import com.transmute.erp.ai.GroqClient;
import com.transmute.erp.common.Ids;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Writes Catalyst's replies. The model sees only the recent chat, not live ERP records, so it
 * is told not to invent figures.
 */
@Service
public class CatalystService {

    static final String AI_SENDER = "ai";
    static final String AI_LABEL = "Catalyst AI";
    static final String NOT_CONFIGURED =
            "AI replies are off. Set GROQ_API_KEY on the server to turn them on.";
    private static final int HISTORY = 10;

    private static final String SYSTEM_PROMPT =
            "You are Catalyst, the assistant inside TransMute, an ERP for a grocery and food distribution "
            + "business (wholesale, delivery vans, shops, supplier purchasing, credit customers, cash). "
            + "Answer briefly and practically. You do not have live access to the ERP records, so do not "
            + "invent figures, customer names or order numbers; say what you would need to check instead.";

    private final GroqClient groq;
    private final CatalystMessageRepository messages;

    public CatalystService(GroqClient groq, CatalystMessageRepository messages) {
        this.groq = groq;
        this.messages = messages;
    }

    /** Saves an AI reply to the chat, using the recent history as context. */
    public CatalystMessage replyTo(CatalystMessage userMessage) {
        List<CatalystMessage> all = messages.findAllByOrderByCreatedAtAsc();
        List<CatalystMessage> recent = all.subList(Math.max(0, all.size() - HISTORY), all.size());

        List<Map<String, String>> prompt = new ArrayList<>();
        prompt.add(Map.of("role", "system", "content", SYSTEM_PROMPT));
        for (CatalystMessage m : recent) {
            if (m.getText() != null) {
                prompt.add(Map.of("role", AI_SENDER.equals(m.getSender()) ? "assistant" : "user",
                        "content", m.getText()));
            }
        }

        Optional<String> reply = groq.complete(prompt, 500, "low");
        CatalystMessage saved = new CatalystMessage();
        saved.setId(Ids.next("MSG"));
        saved.setSender(AI_SENDER);
        saved.setSenderLabel(AI_LABEL);
        saved.setCreatedAt(Instant.now());
        saved.setText(reply.orElse(groq.configured() ? "Catalyst could not reply just now. Try again." : NOT_CONFIGURED));
        return messages.save(saved);
    }
}
