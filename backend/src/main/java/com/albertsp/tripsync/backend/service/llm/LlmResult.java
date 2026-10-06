package com.albertsp.tripsync.backend.service.llm;

/** Raw model output plus how it ended and what it cost. */
public record LlmResult(String text, String finishReason, LlmUsage usage) {
}
