package com.albertsp.tripsync.backend.service.llm;

import com.albertsp.tripsync.backend.exceptions.InvalidLlmOutputException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** Shared steps of every output parser: strict JSON reading and readable validation errors for the retry. */
public final class StructuredOutput {

    private static final int MAX_REPORTED_VIOLATIONS = 6;
    private static final int MAX_ERROR_CHARS = 200;
    private static final Pattern CODE_FENCE = Pattern.compile("^```(?:json)?\\s*(.*?)\\s*```$", Pattern.DOTALL);

    /** Unknown or null properties and trailing text are errors: the model must follow the schema exactly. */
    private static final JsonMapper STRICT = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .enable(DeserializationFeature.FAIL_ON_NULL_CREATOR_PROPERTIES)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    private StructuredOutput() {
    }

    public static <T> T read(String raw, Class<T> type) {
        if (raw == null || raw.isBlank()) {
            throw new InvalidLlmOutputException("La respuesta está vacía", raw, null);
        }
        String json = raw.trim();
        Matcher fence = CODE_FENCE.matcher(json);
        if (fence.matches()) {
            json = fence.group(1);
        }
        try {
            return STRICT.readValue(json, type);
        } catch (JacksonException e) {
            throw new InvalidLlmOutputException(
                    "JSON inválido o con campos inesperados: " + firstLine(e.getOriginalMessage()), raw, e);
        }
    }

    public static <T> void validate(Validator validator, T value, String raw) {
        Set<ConstraintViolation<T>> violations = validator.validate(value);
        if (violations.isEmpty()) {
            return;
        }
        String detail = violations.stream()
                .map(v -> v.getPropertyPath() + " " + v.getMessage())
                .sorted()
                .limit(MAX_REPORTED_VIOLATIONS)
                .collect(Collectors.joining("; "));
        throw new InvalidLlmOutputException("Campos no válidos: " + detail, raw, null);
    }

    private static String firstLine(String message) {
        if (message == null) {
            return "";
        }
        String line = message.lines().findFirst().orElse("");
        return line.length() <= MAX_ERROR_CHARS ? line : line.substring(0, MAX_ERROR_CHARS) + "…";
    }
}
