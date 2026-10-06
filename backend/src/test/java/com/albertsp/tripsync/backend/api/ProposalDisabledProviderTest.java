package com.albertsp.tripsync.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** A real provider without API key must disable generation instead of serving invented data. */
@SpringBootTest(properties = {"app.llm.provider=openai-compatible", "app.llm.api-key="})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProposalDisabledProviderTest extends ApiTestSupport {

    @Test
    void generationIs503ButEverythingElseWorks() throws Exception {
        UUID trip = createTrip("disabled-creator", 3);
        joinThree(trip);

        assertEquals(503, generate(trip, "disabled-creator").getResponse().getStatus());
        assertEquals("OPEN", getProposals(trip, null).path("status").stringValue(""));
        assertEquals(0, getProposals(trip, null).path("proposals").size());
    }
}
