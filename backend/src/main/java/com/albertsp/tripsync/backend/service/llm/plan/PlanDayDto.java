package com.albertsp.tripsync.backend.service.llm.plan;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PlanDayDto(
        @NotNull @Min(1) Integer day,
        @NotBlank @Size(max = PlanDayDto.MAX_PART) String morning,
        @NotBlank @Size(max = PlanDayDto.MAX_PART) String afternoon,
        @NotBlank @Size(max = PlanDayDto.MAX_PART) String evening) {

    public static final int MAX_PART = 300;
}
