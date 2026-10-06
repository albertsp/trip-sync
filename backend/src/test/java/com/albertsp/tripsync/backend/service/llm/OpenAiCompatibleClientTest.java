package com.albertsp.tripsync.backend.service.llm;

import com.albertsp.tripsync.backend.exceptions.InvalidLlmOutputException;
import com.albertsp.tripsync.backend.exceptions.LlmUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenAiCompatibleClientTest {

    private static final String URL = "https://llm.test/v1/chat/completions";
    private static final LlmSchema SCHEMA = new LlmSchema("trip_proposals", "{\"type\":\"object\"}");

    private final JsonMapper mapper = JsonMapper.builder().build();
    private MockRestServiceServer server;
    private OpenAiCompatibleClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        LlmProperties properties = new LlmProperties("openai-compatible", "https://llm.test/v1/", "secret-key",
                "test-model", 4096, 1000, 3, 2, 60, 50, 3);
        client = new OpenAiCompatibleClient(builder, properties);
    }

    private static String completion(String content, String finishReason) {
        String escaped = content.replace("\\", "\\\\").replace("\"", "\\\"");
        return "{\"choices\":[{\"finish_reason\":\"" + finishReason + "\",\"message\":{\"role\":\"assistant\",\"content\":\""
                + escaped + "\"}}],\"usage\":{\"prompt_tokens\":100,\"completion_tokens\":50,\"total_tokens\":150}}";
    }

    @Test
    void sendsAuthorizedStructuredRequestAndReadsTheAnswer() {
        server.expect(requestTo(URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer secret-key"))
                .andExpect(header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE))
                .andExpect(request -> {
                    JsonNode body = mapper.readTree(((MockClientHttpRequest) request).getBodyAsString());
                    assertEquals("test-model", body.path("model").stringValue(""));
                    assertEquals(4096, body.path("max_tokens").asInt());
                    assertEquals("system", body.path("messages").path(0).path("role").stringValue(""));
                    assertEquals("SYS", body.path("messages").path(0).path("content").stringValue(""));
                    assertEquals("user", body.path("messages").path(1).path("role").stringValue(""));
                    assertEquals("USER", body.path("messages").path(1).path("content").stringValue(""));
                    JsonNode format = body.path("response_format");
                    assertEquals("json_schema", format.path("type").stringValue(""));
                    assertEquals("trip_proposals", format.path("json_schema").path("name").stringValue(""));
                    assertTrue(format.path("json_schema").path("strict").asBoolean());
                    assertEquals("object", format.path("json_schema").path("schema").path("type").stringValue(""));
                })
                .andRespond(withSuccess(completion("{\"ok\":true}", "stop"), MediaType.APPLICATION_JSON));

        LlmResult result = client.complete("SYS", "USER", SCHEMA);

        assertEquals("{\"ok\":true}", result.text());
        assertEquals("stop", result.finishReason());
        assertEquals(new LlmUsage(100, 50, 150), result.usage());
        server.verify();
    }

    @Test
    void rateLimitIsUnavailableWithRetryAfter() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).header(HttpHeaders.RETRY_AFTER, "12"));

        LlmUnavailableException e = assertThrows(LlmUnavailableException.class, () -> client.complete("s", "u", SCHEMA));

        assertEquals(12L, e.getRetryAfterSeconds());
    }

    @Test
    void serverErrorIsUnavailableWithoutRetryAfter() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.BAD_GATEWAY));

        LlmUnavailableException e = assertThrows(LlmUnavailableException.class, () -> client.complete("s", "u", SCHEMA));

        assertNull(e.getRetryAfterSeconds());
    }

    @Test
    void rejectedCredentialsAreUnavailableAndNeverLeakTheKey() {
        server.expect(requestTo(URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("bad key"));

        LlmUnavailableException e = assertThrows(LlmUnavailableException.class, () -> client.complete("s", "u", SCHEMA));

        assertFalse(e.getMessage().contains("secret-key"));
    }

    @Test
    void truncatedAnswerIsInvalidOutput() {
        server.expect(requestTo(URL))
                .andRespond(withSuccess(completion("{\"proposals\":[", "length"), MediaType.APPLICATION_JSON));

        InvalidLlmOutputException e = assertThrows(InvalidLlmOutputException.class, () -> client.complete("s", "u", SCHEMA));

        assertTrue(e.getMessage().contains("length"));
    }

    @Test
    void answerWithoutChoicesIsInvalidOutput() {
        server.expect(requestTo(URL)).andRespond(withSuccess("{\"choices\":[]}", MediaType.APPLICATION_JSON));

        assertThrows(InvalidLlmOutputException.class, () -> client.complete("s", "u", SCHEMA));
    }

    @Test
    void nonJsonAnswerIsInvalidOutput() {
        server.expect(requestTo(URL)).andRespond(withSuccess("<html>oops</html>", MediaType.TEXT_HTML));

        assertThrows(InvalidLlmOutputException.class, () -> client.complete("s", "u", SCHEMA));
    }

    @Test
    void reportsItselfEnabledWithItsModel() {
        assertTrue(client.isEnabled());
        assertEquals("test-model", client.model());
    }
}
