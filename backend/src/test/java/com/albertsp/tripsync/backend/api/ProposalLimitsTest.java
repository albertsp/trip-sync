package com.albertsp.tripsync.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Cooldown of 60 s, 2 generations per trip and 3 per day. */
@SpringBootTest(properties = {
        "app.llm.cooldown-seconds=60",
        "app.llm.max-generations-per-trip=2",
        "app.llm.max-generations-per-day=3"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProposalLimitsTest extends ApiTestSupport {

    @Test
    void cooldownBlocksAnImmediateRegeneration() throws Exception {
        UUID trip = createTrip("limits-cooldown", 3);
        joinThree(trip);
        assertEquals(201, generate(trip, "limits-cooldown").getResponse().getStatus());

        join(trip, "Diego", "Valencia", DAYS, 250); // changed inputs, so it is not a free reuse
        MvcResult blocked = generate(trip, "limits-cooldown");

        assertEquals(429, blocked.getResponse().getStatus());
        String retryAfter = blocked.getResponse().getHeader("Retry-After");
        assertNotNull(retryAfter);
        long seconds = Long.parseLong(retryAfter);
        assertTrue(seconds > 0 && seconds <= 60, retryAfter);
    }

    @Test
    void reusingTheSameInputsIsNotBlockedByTheCooldown() throws Exception {
        UUID trip = createTrip("limits-reuse", 3);
        joinThree(trip);
        generate(trip, "limits-reuse");

        assertEquals(201, generate(trip, "limits-reuse").getResponse().getStatus());
    }

    @Test
    void dailyCapAnswers503() throws Exception {
        // Earlier tests of this class already used part of the daily budget in the shared database.
        MvcResult last = null;
        for (int i = 0; i < 4; i++) {
            UUID trip = createTrip("limits-daily-" + i, 3);
            joinThree(trip);
            last = generate(trip, "limits-daily-" + i);
            if (last.getResponse().getStatus() == 503) {
                break;
            }
        }

        assertEquals(503, last.getResponse().getStatus());
        assertNull(last.getResponse().getHeader("Retry-After"));
    }
}
