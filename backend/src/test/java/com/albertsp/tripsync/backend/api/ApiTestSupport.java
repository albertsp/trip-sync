package com.albertsp.tripsync.backend.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/** Helpers to drive the real HTTP API (security, CSRF, JSON) against the in-memory database. */
abstract class ApiTestSupport {

    protected final JsonMapper mapper = JsonMapper.builder().build();

    @Autowired
    protected MockMvc mvc;

    /** A signed-in Google user, identified by {@code sub}. */
    protected static RequestPostProcessor login(String sub) {
        return SecurityMockMvcRequestPostProcessors.oauth2Login().attributes(attrs -> {
            attrs.put("sub", sub);
            attrs.put("name", "User " + sub);
            attrs.put("email", sub + "@example.com");
        });
    }

    protected JsonNode json(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    protected UUID createTrip(String creatorSub, Integer durationDays) throws Exception {
        String body = """
                {"title":"Escapada","windowStart":"2026-10-01","windowEnd":"2026-10-10","preferredDurationDays":%s}
                """.formatted(durationDays == null ? "null" : durationDays);
        MvcResult result = mvc.perform(post("/trips").with(login(creatorSub)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn();
        return UUID.fromString(json(result).path("id").stringValue(""));
    }

    /** Joins a participant and returns the edit token. */
    protected UUID join(UUID tripId, String name, String origin, String days, int budget) throws Exception {
        String body = """
                {"name":"%s","budgetAmount":%d,"budgetCurrency":"EUR","availableDates":[%s],
                 "destinationType":"MOUNTAIN","originCity":"%s","interests":["NATURE","RELAX"],"notes":"sin vuelos largos"}
                """.formatted(name, budget, days, origin);
        MvcResult result = mvc.perform(post("/trips/" + tripId + "/participants")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn();
        return UUID.fromString(json(result).path("editToken").stringValue(""));
    }

    protected static final String DAYS = "\"2026-10-02\",\"2026-10-03\",\"2026-10-04\",\"2026-10-05\"";

    /** Three participants with preferences; returns their edit tokens. */
    protected UUID[] joinThree(UUID tripId) throws Exception {
        return new UUID[]{
                join(tripId, "Ana", "Madrid", DAYS, 300),
                join(tripId, "Beto", "Sevilla", DAYS, 150),
                join(tripId, "Carla", "Bilbao", DAYS, 500)
        };
    }

    protected MvcResult generate(UUID tripId, String creatorSub) throws Exception {
        return mvc.perform(post("/trips/" + tripId + "/proposals").with(login(creatorSub)).with(csrf())).andReturn();
    }

    protected MvcResult vote(UUID tripId, UUID token, String proposalId) throws Exception {
        var request = put("/trips/" + tripId + "/votes").contentType(MediaType.APPLICATION_JSON)
                .content("{\"proposalId\":\"" + proposalId + "\"}");
        if (token != null) {
            request.header("X-Edit-Token", token.toString());
        }
        return mvc.perform(request).andReturn();
    }

    protected MvcResult confirm(UUID tripId, String creatorSub, String proposalId) throws Exception {
        var request = post("/trips/" + tripId + "/confirm").with(login(creatorSub)).with(csrf());
        if (proposalId != null) {
            request.contentType(MediaType.APPLICATION_JSON).content("{\"proposalId\":\"" + proposalId + "\"}");
        }
        return mvc.perform(request).andReturn();
    }

    protected JsonNode getProposals(UUID tripId, UUID token) throws Exception {
        var request = get("/trips/" + tripId + "/proposals");
        if (token != null) {
            request.header("X-Edit-Token", token.toString());
        }
        return json(mvc.perform(request).andReturn());
    }
}
