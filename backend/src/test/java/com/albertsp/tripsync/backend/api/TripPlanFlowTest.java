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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(properties = "app.llm.max-plan-generations-per-trip=2")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TripPlanFlowTest extends ApiTestSupport {

    private int status(MvcResult result) {
        return result.getResponse().getStatus();
    }

    private MvcResult plan(UUID trip, String sub) throws Exception {
        return mvc.perform(post("/trips/" + trip + "/plan").with(login(sub)).with(csrf())).andReturn();
    }

    private JsonNode tasks(UUID trip) throws Exception {
        return json(mvc.perform(get("/trips/" + trip + "/tasks")).andReturn());
    }

    private JsonNode tasksAs(UUID trip, UUID token) throws Exception {
        return json(mvc.perform(get("/trips/" + trip + "/tasks").header("X-Edit-Token", token.toString())).andReturn());
    }

    private MvcResult addTask(UUID trip, UUID token, String title) throws Exception {
        var request = post("/trips/" + trip + "/tasks").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"" + title + "\"}");
        if (token != null) {
            request.header("X-Edit-Token", token.toString());
        }
        return mvc.perform(request).andReturn();
    }

    private MvcResult patchTask(UUID trip, String taskId, UUID token, String body) throws Exception {
        var request = patch("/trips/" + trip + "/tasks/" + taskId).contentType(MediaType.APPLICATION_JSON).content(body);
        if (token != null) {
            request.header("X-Edit-Token", token.toString());
        }
        return mvc.perform(request).andReturn();
    }

    /** A confirmed trip: 3 participants, 3 days, first proposal chosen by the creator. */
    private UUID confirmedTrip(String creator, UUID[][] tokensOut) throws Exception {
        UUID trip = createTrip(creator, 3);
        tokensOut[0] = joinThree(trip);
        JsonNode body = json(generate(trip, creator));
        confirm(trip, creator, body.path("proposals").path(0).path("id").stringValue(""));
        return trip;
    }

    @Test
    void planDetailsTheWinnerAndSeedsTheChecklist() throws Exception {
        UUID trip = confirmedTrip("plan-creator", new UUID[1][]);

        MvcResult planned = plan(trip, "plan-creator");

        assertEquals(200, status(planned));
        JsonNode body = json(planned);
        assertEquals("PLANNING", body.path("status").stringValue(""));
        JsonNode winner = body.path("proposals").path(0);
        assertTrue(winner.path("winner").asBoolean());
        JsonNode detail = winner.path("detail");
        assertEquals(3, detail.path("days").size());
        assertEquals(1, detail.path("days").path(0).path("day").asInt());
        assertFalse(detail.path("days").path(0).path("morning").stringValue("").isBlank());
        assertTrue(detail.path("tips").size() > 0);
        assertTrue(detail.path("tasks").isMissingNode(), "suggested tasks are not part of the detail");
        assertTrue(body.path("proposals").path(1).path("detail").isNull());

        JsonNode tasks = tasks(trip);
        assertEquals(4, tasks.size());
        assertTrue(tasks.path(0).path("assigneeId").isNull());
        assertFalse(tasks.path(0).path("done").asBoolean());
    }

    @Test
    void planRulesAreEnforced() throws Exception {
        UUID trip = createTrip("rules-plan", 3);
        joinThree(trip);

        assertEquals(409, status(plan(trip, "rules-plan")), "nothing is confirmed yet");

        JsonNode body = json(generate(trip, "rules-plan"));
        assertEquals(409, status(plan(trip, "rules-plan")), "still voting");

        confirm(trip, "rules-plan", body.path("proposals").path(0).path("id").stringValue(""));
        assertEquals(403, status(plan(trip, "stranger")));
        assertEquals(401, status(mvc.perform(post("/trips/" + trip + "/plan").with(csrf())).andReturn()));
        assertEquals(403, status(mvc.perform(post("/trips/" + trip + "/plan").with(login("rules-plan"))).andReturn()), "CSRF");
        assertEquals(200, status(plan(trip, "rules-plan")));
    }

    @Test
    void secondPlanIsAllowedAndThirdIsCapped() throws Exception {
        UUID trip = confirmedTrip("cap-plan", new UUID[1][]);

        assertEquals(200, status(plan(trip, "cap-plan")));
        assertEquals(200, status(plan(trip, "cap-plan")));
        MvcResult capped = plan(trip, "cap-plan");

        assertEquals(429, status(capped));
        assertEquals(4, tasks(trip).size(), "regenerating does not duplicate untouched suggestions");
    }

    @Test
    void regeneratingKeepsTasksPeopleHaveTouched() throws Exception {
        UUID[][] tokens = new UUID[1][];
        UUID trip = confirmedTrip("keep-plan", tokens);
        plan(trip, "keep-plan");
        String claimed = tasks(trip).path(0).path("id").stringValue("");
        patchTask(trip, claimed, tokens[0][0], "{\"claimed\":true}");

        plan(trip, "keep-plan");

        JsonNode after = tasks(trip);
        assertEquals(4, after.size());
        boolean kept = false;
        for (JsonNode t : after) {
            kept |= claimed.equals(t.path("id").stringValue("")) && !t.path("assigneeId").isNull();
        }
        assertTrue(kept, "the claimed task survives the regeneration");
    }

    @Test
    void participantsClaimTickAndAddTasks() throws Exception {
        UUID[][] tokens = new UUID[1][];
        UUID trip = confirmedTrip("tasks-creator", tokens);
        plan(trip, "tasks-creator");
        String first = tasks(trip).path(0).path("id").stringValue("");
        UUID ana = tokens[0][0];
        UUID beto = tokens[0][1];

        JsonNode claimed = json(patchTask(trip, first, ana, "{\"claimed\":true}"));
        assertEquals("Ana", claimed.path("assigneeName").stringValue(""));
        assertTrue(claimed.path("mine").asBoolean());
        assertTrue(tasksAs(trip, ana).path(0).path("mine").asBoolean());
        assertFalse(tasksAs(trip, beto).path(0).path("mine").asBoolean());
        assertFalse(tasks(trip).path(0).path("mine").asBoolean());
        assertEquals(409, status(patchTask(trip, first, beto, "{\"claimed\":true}")), "already claimed");
        assertEquals(403, status(patchTask(trip, first, beto, "{\"claimed\":false}")), "only the owner releases it");

        JsonNode done = json(patchTask(trip, first, beto, "{\"done\":true}"));
        assertTrue(done.path("done").asBoolean());
        assertEquals("Ana", done.path("assigneeName").stringValue(""), "ticking does not change the owner");

        JsonNode released = json(patchTask(trip, first, ana, "{\"claimed\":false}"));
        assertTrue(released.path("assigneeId").isNull());

        MvcResult created = addTask(trip, beto, "  Comprar   pilas  ");
        assertEquals(201, status(created));
        assertEquals("Comprar pilas", json(created).path("title").stringValue(""));
        assertEquals(5, tasks(trip).size());
    }

    @Test
    void taskRulesAreEnforced() throws Exception {
        UUID[][] tokens = new UUID[1][];
        UUID trip = confirmedTrip("task-rules", tokens);
        UUID ana = tokens[0][0];

        assertEquals(409, status(addTask(trip, ana, "Antes de tiempo")), "checklist opens with the plan");
        plan(trip, "task-rules");
        String first = tasks(trip).path(0).path("id").stringValue("");

        assertEquals(401, status(addTask(trip, null, "Sin token")));
        assertEquals(401, status(addTask(trip, UUID.randomUUID(), "Token ajeno")));
        assertEquals(400, status(addTask(trip, ana, "   ")));
        assertEquals(400, status(addTask(trip, ana, "x".repeat(121))));
        assertEquals(404, status(patchTask(trip, UUID.randomUUID().toString(), ana, "{\"done\":true}")));

        UUID otherTrip = createTrip("task-rules-other", 3);
        UUID[] otherTokens = joinThree(otherTrip);
        assertEquals(401, status(patchTask(trip, first, otherTokens[0], "{\"done\":true}")), "token of another trip");

        assertNotNull(tasks(trip));
        assertEquals(404, status(mvc.perform(get("/trips/" + UUID.randomUUID() + "/tasks")).andReturn()));
    }
}
