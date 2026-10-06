package com.albertsp.tripsync.backend.service.llm.proposal;

import com.albertsp.tripsync.backend.service.llm.LlmSchema;

/**
 * JSON Schema sent to the provider. It uses only the common subset (no min/max keywords)
 * so every OpenAI-compatible provider accepts it; counts and ranges are enforced in code.
 */
public final class ProposalSchemas {

    public static final String PROPOSALS_NAME = "trip_proposals";

    public static final LlmSchema PROPOSALS = new LlmSchema(PROPOSALS_NAME, """
            {
              "type": "object",
              "additionalProperties": false,
              "required": ["proposals"],
              "properties": {
                "proposals": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["angle", "destination", "country", "fitScore", "whyFits", "tradeoffs", "days", "costBreakdown", "currency"],
                    "properties": {
                      "angle": { "type": "string", "enum": ["CONSENSUS", "BUDGET", "AMBITIOUS"] },
                      "destination": { "type": "string" },
                      "country": { "type": "string" },
                      "fitScore": { "type": "integer" },
                      "whyFits": { "type": "string" },
                      "tradeoffs": { "type": "string" },
                      "days": { "type": "array", "items": { "type": "string" } },
                      "costBreakdown": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": ["transport", "lodging", "food", "activities"],
                        "properties": {
                          "transport": { "type": "number" },
                          "lodging": { "type": "number" },
                          "food": { "type": "number" },
                          "activities": { "type": "number" }
                        }
                      },
                      "currency": { "type": "string", "enum": ["EUR", "USD"] }
                    }
                  }
                }
              }
            }
            """);

    private ProposalSchemas() {
    }
}
