package com.albertsp.tripsync.backend.repositories;

import com.albertsp.tripsync.backend.domain.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {
    List<Participant> findByTripId(UUID tripId);

    Optional<Participant> findByTripIdAndEditToken(UUID tripId, UUID editToken);
}
