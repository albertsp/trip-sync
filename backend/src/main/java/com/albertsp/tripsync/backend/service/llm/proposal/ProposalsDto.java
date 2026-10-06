package com.albertsp.tripsync.backend.service.llm.proposal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ProposalsDto(@NotNull @Size(min = 3, max = 3) List<@NotNull @Valid ProposalDto> proposals) {
}
