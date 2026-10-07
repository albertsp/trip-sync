package com.albertsp.tripsync.backend.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * The whole feature against a real PostgreSQL, with the schema built by the Flyway migrations and checked against the
 * entities ({@code ddl-auto: validate}) exactly like production.
 * H2 hides dialect problems (reserved words, column types, locking), so CI runs this against its Postgres service.
 * Locally it is skipped unless POSTGRES_TEST_URL is set, e.g. after {@code docker compose up -d}:
 * {@code POSTGRES_TEST_URL=jdbc:postgresql://localhost:5432/tripsync_data ./mvnw test -Dtest=PostgresFlowTest}
 */
@EnabledIfEnvironmentVariable(named = "POSTGRES_TEST_URL", matches = ".+")
@SpringBootTest(properties = {
        "spring.datasource.url=${POSTGRES_TEST_URL}",
        "spring.datasource.username=${POSTGRES_TEST_USER:tripsync}",
        "spring.datasource.password=${POSTGRES_TEST_PASSWORD:tripsync123}",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PostgresFlowTest extends ApiTestSupport {

    @Test
    void proposalsVotePlanAndChecklistWorkOnPostgres() throws Exception {
        UUID trip = createTrip("pg-creator", 3);
        UUID[] tokens = joinThree(trip);

        JsonNode generated = json(generate(trip, "pg-creator"));
        assertEquals(3, generated.path("proposals").size());
        String winner = generated.path("proposals").path(0).path("id").stringValue("");

        assertEquals(200, vote(trip, tokens[0], winner).getResponse().getStatus());
        assertEquals("CONFIRMED", json(confirm(trip, "pg-creator", null)).path("status").stringValue(""));

        JsonNode planned = json(mvc.perform(post("/trips/" + trip + "/plan").with(login("pg-creator")).with(csrf()))
                .andReturn());
        assertEquals("PLANNING", planned.path("status").stringValue(""));
        assertEquals(3, planned.path("proposals").path(0).path("detail").path("days").size());

        JsonNode tasks = json(mvc.perform(get("/trips/" + trip + "/tasks")).andReturn());
        assertTrue(tasks.size() > 0);

        String first = tasks.path(0).path("id").stringValue("");
        int status = mvc.perform(patch("/trips/" + trip + "/tasks/" + first)
                        .header("X-Edit-Token", tokens[0].toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"claimed\":true,\"done\":true}"))
                .andReturn().getResponse().getStatus();
        assertEquals(200, status);
    }
}
