package com.albertsp.tripsync.backend.service.llm;

import com.albertsp.tripsync.backend.exceptions.InvalidLlmOutputException;
import com.albertsp.tripsync.backend.exceptions.LlmUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StructuredLlmServiceTest {

    private static final LlmSchema SCHEMA = new LlmSchema("test", "{}");

    @Mock
    private LlmClient client;

    private StructuredLlmService service;

    @BeforeEach
    void setUp() {
        service = new StructuredLlmService(client);
    }

    private static LlmResult result(String text, int tokens) {
        return new LlmResult(text, "stop", new LlmUsage(tokens, tokens, tokens * 2));
    }

    private static final Function<String, String> ONLY_GOOD = text -> {
        if (!"good".equals(text)) {
            throw new InvalidLlmOutputException("campo 'x' ausente", text, null);
        }
        return text;
    };

    @Test
    void returnsOnFirstValidAnswer() {
        when(client.isEnabled()).thenReturn(true);
        when(client.complete(any(), any(), any())).thenReturn(result("good", 10));

        StructuredResult<String> out = service.complete("sys", "user", SCHEMA, ONLY_GOOD);

        assertEquals("good", out.value());
        assertEquals(1, out.attempts());
        assertEquals(20, out.usage().totalTokens());
    }

    @Test
    void retriesOnceFeedingTheErrorBackAndSumsUsage() {
        when(client.isEnabled()).thenReturn(true);
        when(client.complete(any(), any(), any())).thenReturn(result("bad", 10), result("good", 5));

        StructuredResult<String> out = service.complete("sys", "user", SCHEMA, ONLY_GOOD);

        assertEquals(2, out.attempts());
        assertEquals(30, out.usage().totalTokens());

        ArgumentCaptor<String> prompts = ArgumentCaptor.forClass(String.class);
        verify(client, times(2)).complete(eq("sys"), prompts.capture(), eq(SCHEMA));
        assertEquals("user", prompts.getAllValues().get(0));
        assertTrue(prompts.getAllValues().get(1).startsWith("user"));
        assertTrue(prompts.getAllValues().get(1).contains("campo 'x' ausente"));
    }

    @Test
    void failsAfterTwoInvalidAnswers() {
        when(client.isEnabled()).thenReturn(true);
        when(client.complete(any(), any(), any())).thenReturn(result("bad", 1));

        InvalidLlmOutputException e = assertThrows(InvalidLlmOutputException.class,
                () -> service.complete("sys", "user", SCHEMA, ONLY_GOOD));

        assertEquals("bad", e.getRawOutput());
        verify(client, times(2)).complete(any(), any(), any());
    }

    @Test
    void truncatedOutputFromTheClientIsAlsoRetried() {
        when(client.isEnabled()).thenReturn(true);
        when(client.complete(any(), any(), any()))
                .thenThrow(new InvalidLlmOutputException("finish_reason=length"))
                .thenReturn(result("good", 1));

        assertEquals(2, service.complete("sys", "user", SCHEMA, ONLY_GOOD).attempts());
    }

    @Test
    void providerFailuresAreNotRetried() {
        when(client.isEnabled()).thenReturn(true);
        when(client.complete(any(), any(), any())).thenThrow(new LlmUnavailableException("429"));

        assertThrows(LlmUnavailableException.class, () -> service.complete("sys", "user", SCHEMA, ONLY_GOOD));
        verify(client, times(1)).complete(any(), any(), any());
    }

    @Test
    void disabledClientFailsWithoutCallingTheProvider() {
        when(client.isEnabled()).thenReturn(false);

        assertThrows(LlmUnavailableException.class, () -> service.complete("sys", "user", SCHEMA, ONLY_GOOD));
        verify(client, never()).complete(any(), any(), any());
    }
}
