package com.albertsp.tripsync.backend.service.llm;

import com.albertsp.tripsync.backend.exceptions.InvalidLlmOutputException;
import com.albertsp.tripsync.backend.exceptions.LlmUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Client for any {@code /chat/completions} API with JSON-schema structured outputs
 * (Mistral, Groq, Cerebras, OpenRouter): only base URL, model and key change.
 * Timeouts belong to the request factory of the builder it receives (see LlmConfig).
 */
public class OpenAiCompatibleClient implements LlmClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleClient.class);
    private static final double TEMPERATURE = 0.7;
    private static final int LOGGED_BODY_CHARS = 300;

    private final JsonMapper mapper = JsonMapper.builder().build();
    private final RestClient restClient;
    private final LlmProperties properties;

    public OpenAiCompatibleClient(RestClient.Builder builder, LlmProperties properties) {
        this.properties = properties;

        this.restClient = builder
                .baseUrl(stripTrailingSlash(properties.baseUrl()))
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                .build();
    }

    @Override
    public LlmResult complete(String systemInstruction, String userContent, LlmSchema schema) {
        String body = buildRequestBody(systemInstruction, userContent, schema);

        String responseBody;
        try {
            responseBody = restClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException e) {
            throw mapHttpError(e);
        } catch (RestClientException e) {
            // Timeouts and connection failures: the message never contains the key.
            throw new LlmUnavailableException("No se pudo contactar con el proveedor de IA", null, e);
        }

        return parseResponse(responseBody);
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public String model() {
        return properties.model();
    }

    private String buildRequestBody(String systemInstruction, String userContent, LlmSchema schema) {
        ObjectNode root = mapper.createObjectNode();
        root.put("model", properties.model());
        root.put("temperature", TEMPERATURE);
        root.put("max_tokens", properties.maxOutputTokens());

        var messages = root.putArray("messages");
        messages.addObject().put("role", "system").put("content", systemInstruction);
        messages.addObject().put("role", "user").put("content", userContent);

        ObjectNode jsonSchema = root.putObject("response_format").put("type", "json_schema").putObject("json_schema");
        jsonSchema.put("name", schema.name());
        jsonSchema.put("strict", true);
        jsonSchema.set("schema", mapper.readTree(schema.json()));

        return mapper.writeValueAsString(root);
    }

    private LlmUnavailableException mapHttpError(RestClientResponseException e) {
        int status = e.getStatusCode().value();
        Long retryAfter = parseRetryAfter(e.getResponseHeaders());
        log.warn("LLM provider answered {}: {}", status, truncate(e.getResponseBodyAsString()));

        String message = switch (status) {
            case 429 -> "El proveedor de IA ha alcanzado su límite de uso";
            case 401, 403 -> "El proveedor de IA ha rechazado las credenciales";
            default -> status >= 500 ? "El proveedor de IA no está disponible" : "El proveedor de IA ha rechazado la petición";
        };
        return new LlmUnavailableException(message, retryAfter, e);
    }

    private LlmResult parseResponse(String responseBody) {
        JsonNode root;
        try {
            root = mapper.readTree(responseBody == null ? "" : responseBody);
        } catch (JacksonException e) {
            throw new InvalidLlmOutputException("La respuesta del proveedor no es JSON", responseBody, e);
        }

        JsonNode choice = root.path("choices").path(0);
        JsonNode content = choice.path("message").path("content");
        if (!content.isString()) {
            throw new InvalidLlmOutputException("La respuesta del proveedor no contiene texto", responseBody, null);
        }

        String finishReason = choice.path("finish_reason").isString() ? choice.path("finish_reason").stringValue("") : "";
        if (!"stop".equals(finishReason)) {
            throw new InvalidLlmOutputException(
                    "La respuesta se interrumpió antes de terminar (finish_reason=" + finishReason + ")",
                    content.stringValue(""), null);
        }

        JsonNode usage = root.path("usage");
        LlmUsage llmUsage = new LlmUsage(
                usage.path("prompt_tokens").asInt(0),
                usage.path("completion_tokens").asInt(0),
                usage.path("total_tokens").asInt(0));

        return new LlmResult(content.stringValue(""), finishReason, llmUsage);
    }

    private static Long parseRetryAfter(HttpHeaders headers) {
        if (headers == null) {
            return null;
        }
        String value = headers.getFirst(HttpHeaders.RETRY_AFTER);
        if (value == null) {
            return null;
        }
        try {
            return Math.max(0L, Long.parseLong(value.trim()));
        } catch (NumberFormatException e) {
            return null; // HTTP-date form: not worth parsing, callers fall back to their cooldown
        }
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String truncate(String text) {
        if (text == null) {
            return "";
        }
        return text.length() <= LOGGED_BODY_CHARS ? text : text.substring(0, LOGGED_BODY_CHARS) + "…";
    }
}
