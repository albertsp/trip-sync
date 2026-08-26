package com.albertsp.tripsync.backend.domain;


import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "availability", uniqueConstraints = {
        @UniqueConstraint(name = "participant_cannot_repeat_day", columnNames = {"participant_id", "day"})
})
public class Availability {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;


    @ManyToOne
    @JoinColumn(name = "participant_id")
    private Participant participant;

    private LocalDate day;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Participant getParticipant() {
        return participant;
    }

    public void setParticipant(Participant participant) {
        this.participant = participant;
    }

    public LocalDate getDay() {
        return day;
    }

    public void setDay(LocalDate day) {
        this.day = day;
    }
}
