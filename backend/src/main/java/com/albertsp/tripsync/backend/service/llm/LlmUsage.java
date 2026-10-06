package com.albertsp.tripsync.backend.service.llm;

public record LlmUsage(int promptTokens, int completionTokens, int totalTokens) {

    public static final LlmUsage NONE = new LlmUsage(0, 0, 0);

    public LlmUsage plus(LlmUsage other) {
        return new LlmUsage(
                promptTokens + other.promptTokens,
                completionTokens + other.completionTokens,
                totalTokens + other.totalTokens);
    }
}
