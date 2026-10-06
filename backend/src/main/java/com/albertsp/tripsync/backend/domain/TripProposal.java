package com.albertsp.tripsync.backend.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** One of the three destinations the model proposed for a trip in a given generation. */
@Entity
@Table(name = "trip_proposals", indexes = {
        @Index(name = "idx_trip_proposals_trip_generation", columnList = "trip_id, generation")
})
public class TripProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    private int generation;

    @Enumerated(EnumType.STRING)
    private ProposalAngle angle;

    /** JSON of the validated model proposal (destination, texts, days, cost breakdown). */
    @Column(length = 30000)
    private String payload;

    /** JSON of the full itinerary, null until the trip is set up. */
    @Column(length = 30000)
    private String detailPayload;

    /** When the detail was last generated, and how many times (cap and cooldown for POST /plan). */
    private LocalDateTime detailGeneratedAt;

    /** Default 0 so Hibernate can add the column to a table that already has rows (ddl-auto: update). */
    @Column(columnDefinition = "integer default 0 not null")
    private int planGenerations;

    private String model;

    private String inputsHash;

    private BigDecimal estimatedCostPerPerson;

    private String currency;

    private int overBudgetCount;

    private LocalDate bestStart;

    private LocalDate bestEnd;

    /** Tokens spent by the whole generation (the same value on its three rows). */
    private int generationTokens;

    private boolean winner;

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

    public int getGeneration() {
        return generation;
    }

    public void setGeneration(int generation) {
        this.generation = generation;
    }

    public ProposalAngle getAngle() {
        return angle;
    }

    public void setAngle(ProposalAngle angle) {
        this.angle = angle;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public String getDetailPayload() {
        return detailPayload;
    }

    public void setDetailPayload(String detailPayload) {
        this.detailPayload = detailPayload;
    }

    public LocalDateTime getDetailGeneratedAt() {
        return detailGeneratedAt;
    }

    public void setDetailGeneratedAt(LocalDateTime detailGeneratedAt) {
        this.detailGeneratedAt = detailGeneratedAt;
    }

    public int getPlanGenerations() {
        return planGenerations;
    }

    public void setPlanGenerations(int planGenerations) {
        this.planGenerations = planGenerations;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getInputsHash() {
        return inputsHash;
    }

    public void setInputsHash(String inputsHash) {
        this.inputsHash = inputsHash;
    }

    public BigDecimal getEstimatedCostPerPerson() {
        return estimatedCostPerPerson;
    }

    public void setEstimatedCostPerPerson(BigDecimal estimatedCostPerPerson) {
        this.estimatedCostPerPerson = estimatedCostPerPerson;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public int getOverBudgetCount() {
        return overBudgetCount;
    }

    public void setOverBudgetCount(int overBudgetCount) {
        this.overBudgetCount = overBudgetCount;
    }

    public LocalDate getBestStart() {
        return bestStart;
    }

    public void setBestStart(LocalDate bestStart) {
        this.bestStart = bestStart;
    }

    public LocalDate getBestEnd() {
        return bestEnd;
    }

    public void setBestEnd(LocalDate bestEnd) {
        this.bestEnd = bestEnd;
    }

    public int getGenerationTokens() {
        return generationTokens;
    }

    public void setGenerationTokens(int generationTokens) {
        this.generationTokens = generationTokens;
    }

    public boolean isWinner() {
        return winner;
    }

    public void setWinner(boolean winner) {
        this.winner = winner;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
