package com.albertsp.tripsync.backend.service.llm.plan;

import java.util.List;

/** What is stored and shown as {@code detail} of the winning proposal: the plan without its suggested tasks. */
public record PlanDetailDto(List<PlanDayDto> days, List<String> tips) {

    public static PlanDetailDto of(PlanDto plan) {
        return new PlanDetailDto(plan.days(), plan.tips());
    }
}
