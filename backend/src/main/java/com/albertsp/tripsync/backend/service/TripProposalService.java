package com.albertsp.tripsync.backend.service;

import com.albertsp.tripsync.backend.domain.Participant;
import com.albertsp.tripsync.backend.domain.ProposalVote;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.TripProposal;
import com.albertsp.tripsync.backend.domain.TripStatus;
import com.albertsp.tripsync.backend.dtos.ProposalItemResponse;
import com.albertsp.tripsync.backend.dtos.ProposalsResponse;
import com.albertsp.tripsync.backend.exceptions.ConflictException;
import com.albertsp.tripsync.backend.exceptions.ForbiddenException;
import com.albertsp.tripsync.backend.exceptions.InvalidRequestException;
import com.albertsp.tripsync.backend.exceptions.LlmUnavailableException;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.exceptions.TooManyRequestsException;
import com.albertsp.tripsync.backend.exceptions.UnauthorizedException;
import com.albertsp.tripsync.backend.exceptions.UnprocessableRequestException;
import com.albertsp.tripsync.backend.repositories.AvailabilityRepository;
import com.albertsp.tripsync.backend.repositories.ParticipantRepository;
import com.albertsp.tripsync.backend.repositories.ProposalVoteRepository;
import com.albertsp.tripsync.backend.repositories.TripProposalRepository;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import com.albertsp.tripsync.backend.service.llm.LlmProperties;
import com.albertsp.tripsync.backend.service.llm.StructuredLlmService;
import com.albertsp.tripsync.backend.service.llm.StructuredResult;
import com.albertsp.tripsync.backend.service.llm.proposal.ProposalDto;
import com.albertsp.tripsync.backend.service.llm.proposal.ProposalSchemas;
import com.albertsp.tripsync.backend.service.llm.proposal.ProposalsContext;
import com.albertsp.tripsync.backend.service.llm.proposal.ProposalsDto;
import com.albertsp.tripsync.backend.service.llm.proposal.ProposalsParser;
import com.albertsp.tripsync.backend.service.proposal.GroupSnapshot;
import com.albertsp.tripsync.backend.service.proposal.ProposalPromptBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Generates, shows, votes and confirms the AI trip proposals. Mutations lock the trip row so they never overlap. */
@Service
public class TripProposalService {

    private static final Logger log = LoggerFactory.getLogger(TripProposalService.class);
    private static final JsonMapper PAYLOAD_MAPPER = JsonMapper.builder().build();

    private final TripRepository tripRepository;
    private final ParticipantRepository participantRepository;
    private final AvailabilityRepository availabilityRepository;
    private final TripProposalRepository proposalRepository;
    private final ProposalVoteRepository voteRepository;
    private final StructuredLlmService llm;
    private final ProposalsParser parser;
    private final LlmProperties properties;
    private final Clock clock;

    public TripProposalService(TripRepository tripRepository, ParticipantRepository participantRepository,
                               AvailabilityRepository availabilityRepository, TripProposalRepository proposalRepository,
                               ProposalVoteRepository voteRepository, StructuredLlmService llm, ProposalsParser parser,
                               LlmProperties properties, Clock clock) {
        this.tripRepository = tripRepository;
        this.participantRepository = participantRepository;
        this.availabilityRepository = availabilityRepository;
        this.proposalRepository = proposalRepository;
        this.voteRepository = voteRepository;
        this.llm = llm;
        this.parser = parser;
        this.properties = properties;
        this.clock = clock;
    }

    /** Latest generation of the trip. {@code editToken} (optional, may be unknown) adds the caller's own vote. */
    @Transactional(readOnly = true)
    public ProposalsResponse get(UUID tripId, UUID editToken) {
        Trip trip = tripRepository.findById(tripId).orElseThrow(() -> notFound(tripId));
        UUID participantId = editToken == null ? null
                : participantRepository.findByTripIdAndEditToken(tripId, editToken).map(Participant::getId).orElse(null);
        return view(trip, participantId);
    }

    @Transactional
    public ProposalsResponse generate(UUID tripId, UUID callerUserId) {
        Trip trip = lockTrip(tripId);
        requireCreator(trip, callerUserId);

        if (!llm.isEnabled()) {
            throw new LlmUnavailableException("La generación con IA no está configurada");
        }
        if (trip.getStatus() != TripStatus.OPEN && trip.getStatus() != TripStatus.VOTING) {
            throw new ConflictException("El viaje ya está confirmado: no se pueden generar más propuestas");
        }

        List<Participant> participants = participantRepository.findByTripId(tripId);
        long withPreferences = participants.stream().filter(GroupSnapshot::hasPreferences).count();
        if (withPreferences < properties.minParticipants()) {
            throw new UnprocessableRequestException(
                    "Faltan participantes con preferencias (mínimo " + properties.minParticipants() + ")");
        }

        GroupSnapshot group = GroupSnapshot.of(trip, participants, availabilityRepository.findByParticipantTripId(tripId));
        String hash = group.inputsHash();

        int latest = proposalRepository.findLatestGeneration(tripId);
        List<TripProposal> previous = latest == 0 ? List.of()
                : proposalRepository.findByTripIdAndGenerationOrderByAngle(tripId, latest);

        if (!previous.isEmpty() && hash.equals(previous.get(0).getInputsHash()) && trip.getStatus() == TripStatus.VOTING) {
            return view(trip, null); // same inputs: no cost, no new generation
        }

        enforceLimits(latest, previous);

        ProposalsContext context = new ProposalsContext(group.best().days(), group.currency().name());
        StructuredResult<ProposalsDto> result = llm.complete(
                ProposalPromptBuilder.SYSTEM,
                ProposalPromptBuilder.user(group),
                ProposalSchemas.PROPOSALS,
                raw -> parser.parse(raw, context));
        log.info("Generated proposals for trip {} (generation {}, {} attempt(s), {} tokens)",
                tripId, latest + 1, result.attempts(), result.usage().totalTokens());

        voteRepository.deleteByTripId(tripId);
        LocalDateTime now = LocalDateTime.now(clock);
        for (ProposalDto dto : result.value().proposals()) {
            proposalRepository.save(toEntity(trip, dto, group, hash, latest + 1, result, now));
        }

        trip.setStatus(TripStatus.VOTING);
        tripRepository.save(trip);
        return view(trip, null);
    }

    @Transactional
    public ProposalsResponse vote(UUID tripId, UUID editToken, UUID proposalId) {
        Trip trip = lockTrip(tripId);
        Participant participant = editToken == null ? null
                : participantRepository.findByTripIdAndEditToken(tripId, editToken).orElse(null);
        if (participant == null) {
            throw new UnauthorizedException("No se ha podido identificar al participante");
        }
        if (trip.getStatus() != TripStatus.VOTING) {
            throw new ConflictException("La votación ya está cerrada");
        }
        if (proposalId == null) {
            throw new InvalidRequestException("Falta la propuesta");
        }

        TripProposal proposal = currentProposal(tripId, proposalId);

        ProposalVote vote = voteRepository.findByTripIdAndParticipantId(tripId, participant.getId())
                .orElseGet(() -> {
                    ProposalVote created = new ProposalVote();
                    created.setTrip(trip);
                    created.setParticipant(participant);
                    return created;
                });
        vote.setProposal(proposal);
        vote.setCreatedAt(LocalDateTime.now(clock));
        voteRepository.save(vote);

        return view(trip, participant.getId());
    }

    /** Closes the vote. The most voted proposal wins; a tie needs the creator's explicit pick. */
    @Transactional
    public ProposalsResponse confirm(UUID tripId, UUID callerUserId, UUID chosenProposalId) {
        Trip trip = lockTrip(tripId);
        requireCreator(trip, callerUserId);
        if (trip.getStatus() != TripStatus.VOTING) {
            throw new ConflictException("No hay una votación abierta que cerrar");
        }

        TripProposal winner;
        if (chosenProposalId != null) {
            winner = currentProposal(tripId, chosenProposalId);
        } else {
            winner = singleLeader(tripId);
        }

        winner.setWinner(true);
        proposalRepository.save(winner);
        trip.setStatus(TripStatus.CONFIRMED);
        tripRepository.save(trip);
        return view(trip, null);
    }

    private TripProposal singleLeader(UUID tripId) {
        int latest = proposalRepository.findLatestGeneration(tripId);
        List<TripProposal> proposals = proposalRepository.findByTripIdAndGenerationOrderByAngle(tripId, latest);
        if (proposals.isEmpty()) {
            throw new ConflictException("Todavía no hay propuestas");
        }
        Map<UUID, Integer> votes = votesByProposal(tripId);
        int max = proposals.stream().mapToInt(p -> votes.getOrDefault(p.getId(), 0)).max().orElse(0);
        List<TripProposal> leaders = proposals.stream().filter(p -> votes.getOrDefault(p.getId(), 0) == max).toList();
        if (leaders.size() != 1) {
            throw new ConflictException("Hay un empate: elige tú la ganadora");
        }
        return leaders.get(0);
    }

    private void enforceLimits(int latestGeneration, List<TripProposal> previous) {
        if (latestGeneration >= properties.maxGenerationsPerTrip()) {
            throw new TooManyRequestsException("Has alcanzado el límite de generaciones de este viaje");
        }
        if (!previous.isEmpty() && previous.get(0).getCreatedAt() != null) {
            long elapsed = Duration.between(previous.get(0).getCreatedAt(), LocalDateTime.now(clock)).toSeconds();
            long remaining = properties.cooldownSeconds() - elapsed;
            if (remaining > 0) {
                throw new TooManyRequestsException("Espera un momento antes de volver a generar", remaining);
            }
        }
        LocalDateTime startOfDay = LocalDateTime.now(clock).toLocalDate().atStartOfDay();
        if (proposalRepository.countGenerationsSince(startOfDay) >= properties.maxGenerationsPerDay()) {
            throw new LlmUnavailableException("Se ha alcanzado el límite diario de generaciones con IA");
        }
    }

    private TripProposal toEntity(Trip trip, ProposalDto dto, GroupSnapshot group, String hash, int generation,
                                  StructuredResult<ProposalsDto> result, LocalDateTime now) {
        BigDecimal cost = dto.costBreakdown().total().setScale(0, RoundingMode.HALF_UP);

        TripProposal entity = new TripProposal();
        entity.setTrip(trip);
        entity.setGeneration(generation);
        entity.setAngle(dto.angle());
        entity.setPayload(PAYLOAD_MAPPER.writeValueAsString(dto));
        entity.setModel(llm.model());
        entity.setInputsHash(hash);
        entity.setEstimatedCostPerPerson(cost);
        entity.setCurrency(group.currency().name());
        entity.setOverBudgetCount(group.overBudgetCount(cost));
        entity.setBestStart(group.best().start());
        entity.setBestEnd(group.best().end());
        entity.setGenerationTokens(result.usage().totalTokens());
        entity.setCreatedAt(now);
        return entity;
    }

    private TripProposal currentProposal(UUID tripId, UUID proposalId) {
        int latest = proposalRepository.findLatestGeneration(tripId);
        return proposalRepository.findById(proposalId)
                .filter(p -> p.getTrip().getId().equals(tripId) && p.getGeneration() == latest)
                .orElseThrow(() -> new ResourceNotFoundException("Propuesta no encontrada: " + proposalId));
    }

    private Map<UUID, Integer> votesByProposal(UUID tripId) {
        Map<UUID, Integer> votes = new HashMap<>();
        for (Object[] row : voteRepository.countVotesByProposal(tripId)) {
            votes.put((UUID) row[0], ((Number) row[1]).intValue());
        }
        return votes;
    }

    private ProposalsResponse view(Trip trip, UUID participantId) {
        UUID tripId = trip.getId();
        int latest = proposalRepository.findLatestGeneration(tripId);
        if (latest == 0) {
            return new ProposalsResponse(tripId, trip.getStatus(), null, null, null, null, List.of());
        }

        List<TripProposal> proposals = proposalRepository.findByTripIdAndGenerationOrderByAngle(tripId, latest).stream()
                .sorted(Comparator.comparing(p -> p.getAngle().ordinal()))
                .toList();
        Map<UUID, Integer> votes = votesByProposal(tripId);

        UUID myVote = participantId == null ? null
                : voteRepository.findByTripIdAndParticipantId(tripId, participantId)
                        .map(v -> v.getProposal().getId()).orElse(null);

        TripProposal first = proposals.get(0);
        return new ProposalsResponse(tripId, trip.getStatus(), latest, first.getModel(), first.getCreatedAt(), myVote,
                proposals.stream().map(p -> toItem(p, votes.getOrDefault(p.getId(), 0))).toList());
    }

    private ProposalItemResponse toItem(TripProposal p, int votes) {
        ProposalDto dto;
        try {
            dto = PAYLOAD_MAPPER.readValue(p.getPayload(), ProposalDto.class);
        } catch (JacksonException e) {
            throw new IllegalStateException("Stored proposal " + p.getId() + " cannot be read", e);
        }
        return new ProposalItemResponse(
                p.getId(), p.getAngle(), dto.destination(), dto.country(), dto.fitScore(), dto.whyFits(),
                dto.tradeoffs(), dto.days(), dto.costBreakdown(), p.getEstimatedCostPerPerson(), p.getCurrency(),
                p.getOverBudgetCount(), new ProposalItemResponse.DateRange(p.getBestStart(), p.getBestEnd()),
                votes, p.isWinner(), detail(p));
    }

    private tools.jackson.databind.JsonNode detail(TripProposal p) {
        if (p.getDetailPayload() == null) {
            return null;
        }
        return PAYLOAD_MAPPER.readTree(p.getDetailPayload());
    }

    private Trip lockTrip(UUID tripId) {
        return tripRepository.findByIdForUpdate(tripId).orElseThrow(() -> notFound(tripId));
    }

    private static void requireCreator(Trip trip, UUID callerUserId) {
        if (callerUserId == null) {
            throw new UnauthorizedException("Inicia sesión para hacerlo");
        }
        if (!Optional.ofNullable(trip.getCreator()).map(c -> c.getId().equals(callerUserId)).orElse(false)) {
            throw new ForbiddenException("Solo el creador del viaje puede hacerlo");
        }
    }

    private static ResourceNotFoundException notFound(UUID tripId) {
        return new ResourceNotFoundException("Trip not found with id: " + tripId);
    }
}
