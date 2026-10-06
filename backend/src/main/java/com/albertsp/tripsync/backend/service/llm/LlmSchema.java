package com.albertsp.tripsync.backend.service.llm;

/** A named JSON Schema the provider is asked to follow. The schema only guides the model: the output is always validated in code. */
public record LlmSchema(String name, String json) {
}
