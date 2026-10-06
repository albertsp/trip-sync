package com.albertsp.tripsync.backend.controllers;

import com.albertsp.tripsync.backend.domain.User;
import com.albertsp.tripsync.backend.dtos.ConfirmRequest;
import com.albertsp.tripsync.backend.dtos.ProposalsResponse;
import com.albertsp.tripsync.backend.dtos.VoteRequest;
import com.albertsp.tripsync.backend.exceptions.UnauthorizedException;
import com.albertsp.tripsync.backend.service.TripProposalService;
import com.albertsp.tripsync.backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class ProposalController {

    private static final String EDIT_TOKEN_HEADER = "X-Edit-Token";

    private final TripProposalService proposalService;
    private final UserService userService;

    public ProposalController(TripProposalService proposalService, UserService userService) {
        this.proposalService = proposalService;
        this.userService = userService;
    }

    @GetMapping("/trips/{tripId}/proposals")
    public ProposalsResponse getProposals(@PathVariable UUID tripId,
                                          @RequestHeader(value = EDIT_TOKEN_HEADER, required = false) String editToken) {
        return proposalService.get(tripId, parseToken(editToken));
    }

    @PostMapping("/trips/{tripId}/proposals")
    public ResponseEntity<ProposalsResponse> generate(@PathVariable UUID tripId,
                                                      @AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(proposalService.generate(tripId, callerId(principal)));
    }

    @PutMapping("/trips/{tripId}/votes")
    public ProposalsResponse vote(@PathVariable UUID tripId,
                                  @RequestHeader(value = EDIT_TOKEN_HEADER, required = false) String editToken,
                                  @RequestBody VoteRequest request) {
        return proposalService.vote(tripId, parseToken(editToken), request.proposalId());
    }

    @PostMapping("/trips/{tripId}/confirm")
    public ProposalsResponse confirm(@PathVariable UUID tripId,
                                     @AuthenticationPrincipal OAuth2User principal,
                                     @RequestBody(required = false) ConfirmRequest request) {
        UUID chosen = request == null ? null : request.proposalId();
        return proposalService.confirm(tripId, callerId(principal), chosen);
    }

    @PostMapping("/trips/{tripId}/plan")
    public ProposalsResponse plan(@PathVariable UUID tripId, @AuthenticationPrincipal OAuth2User principal) {
        return proposalService.plan(tripId, callerId(principal));
    }

    /** Session users get 401 here instead of an OAuth redirect, which a fetch() from the SPA cannot follow. */
    private UUID callerId(OAuth2User principal) {
        if (principal == null) {
            throw new UnauthorizedException("Inicia sesión para hacerlo");
        }
        User user = userService.findOrCreateUser(principal);
        return user.getId();
    }

    /** A malformed token is treated as an unknown one. */
    private static UUID parseToken(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(header.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
