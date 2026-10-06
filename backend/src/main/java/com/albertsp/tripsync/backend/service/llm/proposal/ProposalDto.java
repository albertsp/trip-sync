package com.albertsp.tripsync.backend.service.llm.proposal;

import com.albertsp.tripsync.backend.domain.ProposalAngle;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** One destination proposed by the model. Dates are not part of it: the code fixes the trip window. */
public record ProposalDto(
        @NotNull ProposalAngle angle,
        @NotBlank @Size(max = ProposalDto.MAX_DESTINATION) String destination,
        @NotBlank @Size(max = ProposalDto.MAX_COUNTRY) String country,
        @NotNull @Min(0) @Max(100) Integer fitScore,
        @NotBlank @Size(max = ProposalDto.MAX_WHY_FITS) String whyFits,
        @NotBlank @Size(max = ProposalDto.MAX_TRADEOFFS) String tradeoffs,
        @NotNull @Size(min = 1, max = 30) List<@NotBlank @Size(max = ProposalDto.MAX_DAY) String> days,
        @NotNull @Valid CostBreakdownDto costBreakdown,
        @NotNull @Pattern(regexp = "EUR|USD") String currency) {

    public static final int MAX_DESTINATION = 80;
    public static final int MAX_COUNTRY = 60;
    public static final int MAX_WHY_FITS = 400;
    public static final int MAX_TRADEOFFS = 300;
    public static final int MAX_DAY = 160;
}
