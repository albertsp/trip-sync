package com.albertsp.tripsync.backend.repositories;

import com.albertsp.tripsync.backend.domain.TripProposal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TripProposalRepository extends JpaRepository<TripProposal, UUID> {

    List<TripProposal> findByTripIdAndGenerationOrderByAngle(UUID tripId, int generation);

    Optional<TripProposal> findTopByTripIdOrderByGenerationDescAngleAsc(UUID tripId);

    @Query("select coalesce(max(p.generation), 0) from TripProposal p where p.trip.id = :tripId")
    int findLatestGeneration(UUID tripId);

    /** Generations created since {@code since}, counting one row (CONSENSUS) per generation. */
    @Query("select count(p) from TripProposal p where p.angle = com.albertsp.tripsync.backend.domain.ProposalAngle.CONSENSUS and p.createdAt >= :since")
    long countGenerationsSince(LocalDateTime since);

    Optional<TripProposal> findFirstByTripIdAndWinnerTrueOrderByGenerationDesc(UUID tripId);

    /** Plan (detail) generations since {@code since}: they spend model quota like proposal generations. */
    @Query("select count(p) from TripProposal p where p.detailGeneratedAt >= :since")
    long countPlansSince(LocalDateTime since);
}
