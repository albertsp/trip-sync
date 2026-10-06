package com.albertsp.tripsync.backend.repositories;

import com.albertsp.tripsync.backend.domain.ProposalVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProposalVoteRepository extends JpaRepository<ProposalVote, UUID> {

    Optional<ProposalVote> findByTripIdAndParticipantId(UUID tripId, UUID participantId);

    /** Rows of {@code [proposalId, votes]} for the trip. */
    @Query("select v.proposal.id, count(v) from ProposalVote v where v.trip.id = :tripId group by v.proposal.id")
    List<Object[]> countVotesByProposal(UUID tripId);

    @Modifying
    @Query("delete from ProposalVote v where v.trip.id = :tripId")
    void deleteByTripId(UUID tripId);
}
