package com.albertsp.tripsync.backend.service.llm.proposal;

/** What the code decided before calling the model: the output must respect it. */
public record ProposalsContext(int expectedDays, String currency) {
}
