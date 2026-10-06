package com.albertsp.tripsync.backend.service.llm.plan;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** The model's detailed plan for the winning proposal. Tasks become the shared checklist; days and tips are shown as is. */
public record PlanDto(
        @NotNull @Size(min = 1, max = 30) List<@NotNull @Valid PlanDayDto> days,
        @NotNull @Size(max = PlanDto.MAX_TIPS) List<@NotBlank @Size(max = PlanDto.MAX_TIP) String> tips,
        @NotNull @Size(min = 1, max = PlanDto.MAX_TASKS) List<@NotBlank @Size(max = PlanDto.MAX_TASK) String> tasks) {

    public static final int MAX_TIPS = 8;
    public static final int MAX_TIP = 200;
    public static final int MAX_TASKS = 12;
    public static final int MAX_TASK = 120;
}
