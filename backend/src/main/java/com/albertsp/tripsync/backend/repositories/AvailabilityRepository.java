package com.albertsp.tripsync.backend.repositories;

import com.albertsp.tripsync.backend.domain.Availability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AvailabilityRepository extends JpaRepository<Availability,Long> {

    List<Availability> findByParticipantTripId(UUID tripId);
}
