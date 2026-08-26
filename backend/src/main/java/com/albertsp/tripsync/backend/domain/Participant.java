package com.albertsp.tripsync.backend.domain;


import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "participant")
public class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "trip_id")
    private Trip trip;

    private String name;

    private BigDecimal budgetAmount;

    @Enumerated(EnumType.STRING)
    private TripCurrency budgetCurrency;


    private UUID editToken;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getBudgetAmount() {
        return budgetAmount;
    }

    public void setBudgetAmount(BigDecimal budgetAmount) {
        this.budgetAmount = budgetAmount;
    }

    public TripCurrency getBudgetCurrency() {
        return budgetCurrency;
    }

    public void setBudgetCurrency(TripCurrency budgetCurrency) {
        this.budgetCurrency = budgetCurrency;
    }

    public UUID getEditToken() {
        return editToken;
    }

    public void setEditToken(UUID editToken) {
        this.editToken = editToken;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
