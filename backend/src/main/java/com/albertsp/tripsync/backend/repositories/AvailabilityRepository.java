package com.albertsp.tripsync.backend.repositories;

import com.albertsp.tripsync.backend.domain.Availability;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailabilityRepository extends JpaRepository<Availability,Long> {
}
