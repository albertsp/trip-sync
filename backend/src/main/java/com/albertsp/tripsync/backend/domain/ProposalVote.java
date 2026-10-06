package com.albertsp.tripsync.backend.domain;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

/** A participant's single vote in a trip. Changing the vote updates this row. */
@Entity
@Table(name = "proposal_votes", uniqueConstraints = {
        @UniqueConstraint(name = "one_vote_per_participant", columnNames = {"trip_id", "participant_id"})
})
public class ProposalVote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    @ManyToOne(optional = false)
    @JoinColumn(name = "participant_id")
    private Participant participant;

    @ManyToOne(optional = false)
    @JoinColumn(name = "proposal_id")
    private TripProposal proposal;

    private LocalDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Trip getTrip() {
        return trip;
    }

    public void setTrip(Trip trip) {
        this.trip = trip;
    }

    public Participant getParticipant() {
        return participant;
    }

    public void setParticipant(Participant participant) {
        this.participant = participant;
    }

    public TripProposal getProposal() {
        return proposal;
    }

    public void setProposal(TripProposal proposal) {
        this.proposal = proposal;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
