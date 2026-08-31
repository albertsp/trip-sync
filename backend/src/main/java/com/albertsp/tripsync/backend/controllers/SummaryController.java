package com.albertsp.tripsync.backend.controllers;

import com.albertsp.tripsync.backend.dtos.SummaryResponse;
import com.albertsp.tripsync.backend.service.SummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class SummaryController {
    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService){
        this.summaryService = summaryService;
    }

    @GetMapping("/trips/{id}/summary")
    public ResponseEntity<SummaryResponse> summaryTripById(@PathVariable UUID id){
        return ResponseEntity.ok(summaryService.getSummary(id));
    }
}
