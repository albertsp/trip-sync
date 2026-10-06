package com.albertsp.tripsync.backend.service.llm;

import com.albertsp.tripsync.backend.exceptions.InvalidLlmOutputException;
import com.albertsp.tripsync.backend.exceptions.LlmUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.function.Function;

/** Calls the model and parses its answer, retrying once with the validation error if the first answer is unusable. */
@Service
public class StructuredLlmService {

    private static final Logger log = LoggerFactory.getLogger(StructuredLlmService.class);
    private static final int MAX_ATTEMPTS = 2;
    private static final int MAX_FEEDBACK_CHARS = 300;
    private static final int LOGGED_RAW_CHARS = 2000;

    private final LlmClient client;

    public StructuredLlmService(LlmClient client) {
        this.client = client;
    }

    public boolean isEnabled() {
        return client.isEnabled();
    }

    public String model() {
        return client.model();
    }

    /**
     * @param parser turns the raw text into a validated value, throwing {@link InvalidLlmOutputException} if it cannot
     * @throws LlmUnavailableException if no provider is configured or the provider fails (not retried here)
     * @throws InvalidLlmOutputException if both attempts produced unusable output
     */
    public <T> StructuredResult<T> complete(String systemInstruction, String userContent, LlmSchema schema, Function<String, T> parser) {
        if (!client.isEnabled()) {
            throw new LlmUnavailableException("La generación con IA no está configurada");
        }

        LlmUsage usage = LlmUsage.NONE;
        InvalidLlmOutputException lastError = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            String prompt = lastError == null ? userContent : userContent + retryFeedback(lastError);
            try {
                LlmResult result = client.complete(systemInstruction, prompt, schema);
                usage = usage.plus(result.usage());
                T value = parser.apply(result.text());
                return new StructuredResult<>(value, usage, attempt);
            } catch (InvalidLlmOutputException e) {
                lastError = e;
                log.warn("LLM output rejected on attempt {}/{}: {}", attempt, MAX_ATTEMPTS, e.getMessage());
            }
        }

        log.warn("LLM output rejected after {} attempts. Raw output: {}", MAX_ATTEMPTS, truncate(lastError.getRawOutput()));
        throw new InvalidLlmOutputException(
                "La IA no ha devuelto una respuesta válida tras reintentar: " + lastError.getMessage(),
                lastError.getRawOutput(), lastError);
    }

    private static String retryFeedback(InvalidLlmOutputException error) {
        return "\n\nLA RESPUESTA ANTERIOR NO FUE VÁLIDA: " + truncate(error.getMessage(), MAX_FEEDBACK_CHARS)
                + "\nCorrígelo y responde solo con el JSON que cumple el esquema.";
    }

    private static String truncate(String text) {
        return truncate(text, LOGGED_RAW_CHARS);
    }

    private static String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }
}
