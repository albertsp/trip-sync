package com.albertsp.tripsync.backend.service.llm;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Binds {@code app.llm.*}. Defaults mirror application.yaml so the record also works in plain unit tests. */
@ConfigurationProperties(prefix = "app.llm")
public record LlmProperties(
        @DefaultValue("openai-compatible") String provider,
        @DefaultValue("https://api.mistral.ai/v1") String baseUrl,
        @DefaultValue("") String apiKey,
        @DefaultValue("mistral-small-latest") String model,
        @DefaultValue("8192") int maxOutputTokens,
        @DefaultValue("45000") int timeoutMs,
        @DefaultValue("3") int maxGenerationsPerTrip,
        @DefaultValue("2") int maxPlanGenerationsPerTrip,
        @DefaultValue("60") int cooldownSeconds,
        @DefaultValue("50") int maxGenerationsPerDay,
        @DefaultValue("3") int minParticipants) {
}
