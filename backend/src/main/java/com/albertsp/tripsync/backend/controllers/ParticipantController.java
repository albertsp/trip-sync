package com.albertsp.tripsync.backend.controllers;


import com.albertsp.tripsync.backend.domain.Participant;
import com.albertsp.tripsync.backend.dtos.CreateParticipantRequest;
import com.albertsp.tripsync.backend.dtos.ParticipantResponse;
import com.albertsp.tripsync.backend.service.ParticipantService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class ParticipantController {

    ParticipantService participantService;

    public ParticipantController(ParticipantService participantService) {
        this.participantService = participantService;
    }

    @PostMapping("/trips/{tripId}/participants")
    ResponseEntity<ParticipantResponse> createParticipant(@PathVariable UUID tripId, @RequestBody CreateParticipantRequest request) {

        Participant participant = participantService.createParticipant(tripId,request);

        ParticipantResponse response = new ParticipantResponse(
                participant.getId(),
                participant.getName(),
                participant.getBudgetAmount(),
                participant.getBudgetCurrency(),
                participant.getEditToken()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);

    }
}
