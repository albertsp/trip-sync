package com.albertsp.tripsync.backend.repositories;

import com.albertsp.tripsync.backend.domain.TripTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TripTaskRepository extends JpaRepository<TripTask, UUID> {

    List<TripTask> findByTripIdOrderByCreatedAtAscIdAsc(UUID tripId);

    long countByTripId(UUID tripId);
}
