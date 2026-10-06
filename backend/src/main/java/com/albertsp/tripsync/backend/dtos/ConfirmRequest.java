package com.albertsp.tripsync.backend.dtos;

import java.util.UUID;

/** Optional body of POST /confirm: the creator's pick, required only when the vote is tied. */
public record ConfirmRequest(UUID proposalId) {
}
