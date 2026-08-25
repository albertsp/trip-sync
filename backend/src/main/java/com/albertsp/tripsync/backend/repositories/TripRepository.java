package com.albertsp.tripsync.backend.repositories;

import com.albertsp.tripsync.backend.domain.Trip;
import org.springframework.data.jpa.repository.JpaRepository;


import java.util.UUID;

public interface TripRepository extends JpaRepository<Trip, UUID> {
}
