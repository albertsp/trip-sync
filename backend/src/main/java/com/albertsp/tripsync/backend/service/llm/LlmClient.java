package com.albertsp.tripsync.backend.service.llm;

/**
 * Provider-agnostic access to a chat LLM that answers with JSON constrained by a schema.
 * Implementations must never log or expose the API key.
 */
public interface LlmClient {

    /**
     * Sends one request and returns the raw model output.
     *
     * @throws com.albertsp.tripsync.backend.exceptions.LlmUnavailableException if the provider is down, rate limited or misconfigured
     * @throws com.albertsp.tripsync.backend.exceptions.InvalidLlmOutputException if the model did not finish normally (e.g. truncated)
     */
    LlmResult complete(String systemInstruction, String userContent, LlmSchema schema);

    /** False when no provider is configured: callers answer 503 instead of calling {@link #complete}. */
    boolean isEnabled();

    /** Model identifier stored with each generation. */
    String model();
}
