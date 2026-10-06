package com.albertsp.tripsync.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/** No cooldown, but only 2 generations per trip. */
@SpringBootTest(properties = "app.llm.max-generations-per-trip=2")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProposalPerTripCapTest extends ApiTestSupport {

    @Test
    void thirdGenerationOfATripIsRejected() throws Exception {
        UUID trip = createTrip("cap-creator", 3);
        joinThree(trip);
        assertEquals(201, generate(trip, "cap-creator").getResponse().getStatus());

        join(trip, "Diego", "Valencia", DAYS, 250);
        assertEquals(201, generate(trip, "cap-creator").getResponse().getStatus());

        join(trip, "Eva", "Vigo", DAYS, 250);
        var blocked = generate(trip, "cap-creator");

        assertEquals(429, blocked.getResponse().getStatus());
        assertNull(blocked.getResponse().getHeader("Retry-After"), "waiting does not help against the per-trip cap");
    }
}
