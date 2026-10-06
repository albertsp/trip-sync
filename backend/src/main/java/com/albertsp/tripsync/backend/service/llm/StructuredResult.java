package com.albertsp.tripsync.backend.service.llm;

/** A validated model answer with the tokens spent (retries included) and the number of attempts used. */
public record StructuredResult<T>(T value, LlmUsage usage, int attempts) {
}
