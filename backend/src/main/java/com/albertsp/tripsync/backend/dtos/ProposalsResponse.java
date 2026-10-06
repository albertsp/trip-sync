package com.albertsp.tripsync.backend.dtos;

import com.albertsp.tripsync.backend.domain.TripStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Body of GET/POST /proposals, PUT /votes, POST /confirm and POST /plan. */
public record ProposalsResponse(
        UUID tripId,
        TripStatus status,
        Integer generation,
        String model,
        LocalDateTime generatedAt,
        UUID myVoteProposalId,
        List<ProposalItemResponse> proposals) {
}
