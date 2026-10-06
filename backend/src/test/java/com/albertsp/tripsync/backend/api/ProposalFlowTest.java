package com.albertsp.tripsync.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProposalFlowTest extends ApiTestSupport {

    private int status(MvcResult result) {
        return result.getResponse().getStatus();
    }

    @Test
    void emptyBeforeAnyGeneration() throws Exception {
        UUID trip = createTrip("flow-empty", 3);

        JsonNode body = getProposals(trip, null);

        assertEquals("OPEN", body.path("status").stringValue(""));
        assertEquals(0, body.path("proposals").size());
        assertTrue(body.path("generation").isNull());
    }

    @Test
    void unknownTripIs404() throws Exception {
        MvcResult result = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/trips/" + UUID.randomUUID() + "/proposals")).andReturn();

        assertEquals(404, status(result));
    }

    @Test
    void generateVoteAndConfirmFullFlow() throws Exception {
        UUID trip = createTrip("flow-creator", 3);
        UUID[] tokens = joinThree(trip);

        MvcResult generated = generate(trip, "flow-creator");
        assertEquals(201, status(generated));
        JsonNode body = json(generated);
        assertEquals("VOTING", body.path("status").stringValue(""));
        assertEquals(1, body.path("generation").asInt());
        assertEquals("fake", body.path("model").stringValue(""));
        assertEquals(3, body.path("proposals").size());

        JsonNode first = body.path("proposals").path(0);
        assertEquals("CONSENSUS", first.path("angle").stringValue(""));
        assertEquals(3, first.path("days").size());
        assertEquals("EUR", first.path("currency").stringValue(""));
        assertEquals("2026-10-02", first.path("bestDates").path("start").stringValue(""));
        assertEquals("2026-10-04", first.path("bestDates").path("end").stringValue(""));
        assertEquals(185, first.path("estimatedCostPerPerson").asInt());
        // 185 EUR: only the 150 EUR budget is below it
        assertEquals(1, first.path("overBudgetCount").asInt());
        assertEquals(0, first.path("votes").asInt());
        assertFalse(first.path("winner").asBoolean());
        assertTrue(first.path("detail").isNull());

        String p1 = body.path("proposals").path(0).path("id").stringValue("");
        String p2 = body.path("proposals").path(1).path("id").stringValue("");

        // Ana and Beto vote p1, Carla votes p2 and then changes her mind to p1
        assertEquals(200, status(vote(trip, tokens[0], p1)));
        assertEquals(200, status(vote(trip, tokens[1], p1)));
        JsonNode afterCarla = json(vote(trip, tokens[2], p2));
        assertEquals(p2, afterCarla.path("myVoteProposalId").stringValue(""));
        assertEquals(1, afterCarla.path("proposals").path(1).path("votes").asInt());

        JsonNode changed = json(vote(trip, tokens[2], p1));
        assertEquals(3, changed.path("proposals").path(0).path("votes").asInt());
        assertEquals(0, changed.path("proposals").path(1).path("votes").asInt());

        JsonNode mine = getProposals(trip, tokens[0]);
        assertEquals(p1, mine.path("myVoteProposalId").stringValue(""));
        assertTrue(getProposals(trip, null).path("myVoteProposalId").isNull());

        JsonNode confirmed = json(confirm(trip, "flow-creator", null));
        assertEquals("CONFIRMED", confirmed.path("status").stringValue(""));
        assertTrue(confirmed.path("proposals").path(0).path("winner").asBoolean());
        assertFalse(confirmed.path("proposals").path(1).path("winner").asBoolean());

        assertEquals(409, status(vote(trip, tokens[0], p2)), "voting is closed after confirming");
        assertEquals(409, status(generate(trip, "flow-creator")), "no new generation after confirming");
    }

    @Test
    void tieRequiresTheCreatorsChoice() throws Exception {
        UUID trip = createTrip("tie-creator", 2);
        UUID[] tokens = joinThree(trip);
        JsonNode body = json(generate(trip, "tie-creator"));
        String p1 = body.path("proposals").path(0).path("id").stringValue("");
        String p2 = body.path("proposals").path(1).path("id").stringValue("");

        assertEquals(409, status(confirm(trip, "tie-creator", null)), "zero votes is a tie");

        vote(trip, tokens[0], p1);
        vote(trip, tokens[1], p2);
        assertEquals(409, status(confirm(trip, "tie-creator", null)), "1-1 is a tie");

        MvcResult chosen = confirm(trip, "tie-creator", p2);
        assertEquals(200, status(chosen));
        assertTrue(json(chosen).path("proposals").path(1).path("winner").asBoolean());
    }

    @Test
    void onlyTheCreatorCanGenerateAndConfirm() throws Exception {
        UUID trip = createTrip("owner", 3);
        joinThree(trip);

        assertEquals(403, status(generate(trip, "stranger")));
        assertEquals(401, status(mvc.perform(post("/trips/" + trip + "/proposals").with(csrf())).andReturn()));

        generate(trip, "owner");
        assertEquals(403, status(confirm(trip, "stranger", null)));
    }

    @Test
    void mutationsWithoutCsrfTokenAreRejected() throws Exception {
        UUID trip = createTrip("csrf-owner", 3);
        joinThree(trip);

        MvcResult result = mvc.perform(post("/trips/" + trip + "/proposals")
                .with(login("csrf-owner"))).andReturn();

        assertEquals(403, status(result));
    }

    @Test
    void needsAtLeastThreeParticipantsWithPreferences() throws Exception {
        UUID trip = createTrip("few", 3);
        join(trip, "Ana", "Madrid", DAYS, 300);
        join(trip, "Beto", "Sevilla", DAYS, 300);

        assertEquals(422, status(generate(trip, "few")));
    }

    @Test
    void sameInputsReuseTheExistingGeneration() throws Exception {
        UUID trip = createTrip("reuse", 3);
        joinThree(trip);

        JsonNode first = json(generate(trip, "reuse"));
        JsonNode second = json(generate(trip, "reuse"));

        assertEquals(1, first.path("generation").asInt());
        assertEquals(1, second.path("generation").asInt());
        assertEquals(first.path("proposals").path(0).path("id").stringValue(""),
                second.path("proposals").path(0).path("id").stringValue(""));
    }

    @Test
    void changedInputsCreateANewGenerationAndClearVotes() throws Exception {
        UUID trip = createTrip("regen", 3);
        UUID[] tokens = joinThree(trip);
        JsonNode first = json(generate(trip, "regen"));
        vote(trip, tokens[0], first.path("proposals").path(0).path("id").stringValue(""));

        join(trip, "Diego", "Valencia", DAYS, 250);
        JsonNode second = json(generate(trip, "regen"));

        assertEquals(2, second.path("generation").asInt());
        assertEquals(0, second.path("proposals").path(0).path("votes").asInt());
        assertTrue(getProposals(trip, tokens[0]).path("myVoteProposalId").isNull());
    }

    @Test
    void votingRulesAreEnforced() throws Exception {
        UUID trip = createTrip("rules", 3);
        UUID[] tokens = joinThree(trip);
        JsonNode body = json(generate(trip, "rules"));
        String p1 = body.path("proposals").path(0).path("id").stringValue("");

        assertEquals(401, status(vote(trip, null, p1)), "missing token");
        assertEquals(401, status(vote(trip, UUID.randomUUID(), p1)), "unknown token");

        UUID otherTrip = createTrip("rules-other", 3);
        UUID[] otherTokens = joinThree(otherTrip);
        assertEquals(401, status(vote(trip, otherTokens[0], p1)), "token of another trip");

        assertEquals(404, status(vote(trip, tokens[0], UUID.randomUUID().toString())), "unknown proposal");
        JsonNode otherBody = json(generate(otherTrip, "rules-other"));
        String foreign = otherBody.path("proposals").path(0).path("id").stringValue("");
        assertEquals(404, status(vote(trip, tokens[0], foreign)), "proposal of another trip");

        MvcResult malformed = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .put("/trips/" + trip + "/votes").header("X-Edit-Token", "not-a-uuid")
                .contentType(MediaType.APPLICATION_JSON).content("{\"proposalId\":\"" + p1 + "\"}")).andReturn();
        assertEquals(401, status(malformed));
    }

    @Test
    void storedDataNeverContainsParticipantNamesInTheResponse() throws Exception {
        UUID trip = createTrip("privacy", 3);
        joinThree(trip);

        String raw = generate(trip, "privacy").getResponse().getContentAsString();

        assertNotNull(raw);
        assertFalse(raw.contains("Ana"));
        assertFalse(raw.contains("editToken"));
    }
}
