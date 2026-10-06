package com.albertsp.tripsync.backend.service.llm.plan;

import com.albertsp.tripsync.backend.exceptions.InvalidLlmOutputException;
import com.albertsp.tripsync.backend.service.llm.FakeLlmClient;
import com.albertsp.tripsync.backend.service.llm.proposal.ProposalPromptFormat;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlanParserTest {

    private PlanParser parser;
    private String valid;

    @BeforeEach
    void setUp() {
        parser = new PlanParser(Validation.buildDefaultValidatorFactory().getValidator());
        valid = new FakeLlmClient().complete("sys", ProposalPromptFormat.daysLine(3), PlanSchemas.PLAN).text();
    }

    private void rejected(String raw, int days) {
        assertThrows(InvalidLlmOutputException.class, () -> parser.parse(raw, days));
    }

    @Test
    void acceptsValidPlan() {
        PlanDto plan = parser.parse(valid, 3);

        assertEquals(3, plan.days().size());
        assertEquals(4, plan.tasks().size());
        assertEquals(2, plan.tips().size());
    }

    @Test
    void rejectsWrongNumberOfDays() {
        InvalidLlmOutputException e = assertThrows(InvalidLlmOutputException.class, () -> parser.parse(valid, 4));

        assertTrue(e.getMessage().contains("4"), e.getMessage());
    }

    @Test
    void rejectsDaysOutOfOrder() {
        rejected(valid.replace("\"day\":2", "\"day\":7"), 3);
    }

    @Test
    void rejectsTruncatedOrUnknownFieldsOrMissingParts() {
        rejected(valid.substring(0, valid.length() / 2), 3);
        rejected(valid.replaceFirst("\"tips\"", "\"extra\":1,\"tips\""), 3);
        rejected(valid.replaceFirst("\"morning\":\"[^\"]*\",", ""), 3);
        rejected("", 3);
    }

    @Test
    void rejectsNoTasks() {
        rejected(valid.replaceFirst("\"tasks\":\\[[^]]*]", "\"tasks\":[]"), 3);
    }

    @Test
    void stripsLinksAndKeepsTextReadable() {
        String hostile = valid.replaceFirst("\"Reservar alojamiento\"",
                "\"Reservar en https://evil.example/pay <b>ya</b>\"");

        String task = parser.parse(hostile, 3).tasks().get(0);

        assertFalse(task.contains("http"), task);
        assertFalse(task.contains("<"), task);
        assertTrue(task.contains("Reservar"), task);
    }

    @Test
    void dropsRepeatedTasksIgnoringCase() {
        String repeated = valid.replaceFirst("\"Organizar el transporte desde cada ciudad\"", "\"RESERVAR ALOJAMIENTO\"");

        assertEquals(3, parser.parse(repeated, 3).tasks().size());
    }

    @Test
    void truncatesOverlongTasks() {
        String raw = valid.replaceFirst("\"Reservar alojamiento\"", "\"" + "t".repeat(400) + "\"");

        assertEquals(PlanDto.MAX_TASK, parser.parse(raw, 3).tasks().get(0).length());
    }
}
