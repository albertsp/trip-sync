package com.albertsp.tripsync.backend.service;

import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class TripService {

    private final TripRepository tripRepository;

    public TripService(TripRepository tripRepository) {
        this.tripRepository = tripRepository;
    }

    public Trip getTripEntityById(UUID id) {
        return tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(" Trip not found with id: " + id));
    }
}
