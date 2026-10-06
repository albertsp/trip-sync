package com.albertsp.tripsync.backend.service.llm.plan;

import com.albertsp.tripsync.backend.service.llm.LlmSchema;

/** Same approach as the proposals schema: common JSON Schema subset, counts and ranges enforced in code. */
public final class PlanSchemas {

    public static final String PLAN_NAME = "trip_plan";

    public static final LlmSchema PLAN = new LlmSchema(PLAN_NAME, """
            {
              "type": "object",
              "additionalProperties": false,
              "required": ["days", "tips", "tasks"],
              "properties": {
                "days": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["day", "morning", "afternoon", "evening"],
                    "properties": {
                      "day": { "type": "integer" },
                      "morning": { "type": "string" },
                      "afternoon": { "type": "string" },
                      "evening": { "type": "string" }
                    }
                  }
                },
                "tips": { "type": "array", "items": { "type": "string" } },
                "tasks": { "type": "array", "items": { "type": "string" } }
              }
            }
            """);

    private PlanSchemas() {
    }
}
