package com.albertsp.tripsync.backend.controllers.test;


import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.User;
import com.albertsp.tripsync.backend.dtos.CreateTripRequest;
import com.albertsp.tripsync.backend.dtos.TripResponse;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import com.albertsp.tripsync.backend.service.UserService;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("!prod")
@RequestMapping("/test")
public class TestSeedController {
    private final TripRepository tripRepository;
    private final UserService userService;

    public TestSeedController(TripRepository tripRepository, UserService userService) {
        this.tripRepository = tripRepository;
        this.userService = userService;
    }
    @PostMapping("/trips")
    public ResponseEntity<TripResponse> seedTrip(@RequestBody CreateTripRequest request) {
        User testUser = userService.findOrCreateTestUser();

        Trip trip = new Trip();
        trip.setCreator(testUser);
        trip.setTitle(request.title());
        trip.setWindowStart(request.windowStart());
        trip.setWindowEnd(request.windowEnd());

        Trip saved = tripRepository.save(trip);

        TripResponse response = new TripResponse(
                saved.getId(), saved.getTitle(), saved.getWindowStart(),
                saved.getWindowEnd(), saved.getStatus(), saved.getCreatedAt()
        );
        return ResponseEntity.ok(response);
    }


}
