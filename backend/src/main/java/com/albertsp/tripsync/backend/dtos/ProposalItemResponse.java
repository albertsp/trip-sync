package com.albertsp.tripsync.backend.dtos;

import com.albertsp.tripsync.backend.domain.ProposalAngle;
import com.albertsp.tripsync.backend.service.llm.proposal.CostBreakdownDto;
import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProposalItemResponse(
        UUID id,
        ProposalAngle angle,
        String destination,
        String country,
        int fitScore,
        String whyFits,
        String tradeoffs,
        List<String> days,
        CostBreakdownDto costBreakdown,
        BigDecimal estimatedCostPerPerson,
        String currency,
        int overBudgetCount,
        DateRange bestDates,
        int votes,
        boolean winner,
        JsonNode detail) {

    public record DateRange(LocalDate start, LocalDate end) {
    }
}
