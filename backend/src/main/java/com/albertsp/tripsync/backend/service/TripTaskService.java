package com.albertsp.tripsync.backend.service;

import com.albertsp.tripsync.backend.domain.Participant;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.TripStatus;
import com.albertsp.tripsync.backend.domain.TripTask;
import com.albertsp.tripsync.backend.dtos.TaskResponse;
import com.albertsp.tripsync.backend.exceptions.ConflictException;
import com.albertsp.tripsync.backend.exceptions.ForbiddenException;
import com.albertsp.tripsync.backend.exceptions.InvalidRequestException;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.exceptions.UnauthorizedException;
import com.albertsp.tripsync.backend.repositories.ParticipantRepository;
import com.albertsp.tripsync.backend.repositories.TripRepository;
import com.albertsp.tripsync.backend.repositories.TripTaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/** The trip's shared checklist. Participants identify themselves with their edit token, like when voting. */
@Service
public class TripTaskService {

    static final int MAX_TITLE_LENGTH = 120;
    static final int MAX_TASKS_PER_TRIP = 50;
    private static final Pattern CONTROL_OR_SPACES = Pattern.compile("[\\p{Cntrl}\\s]+");

    private final TripRepository tripRepository;
    private final TripTaskRepository taskRepository;
    private final ParticipantRepository participantRepository;
    private final Clock clock;

    public TripTaskService(TripRepository tripRepository, TripTaskRepository taskRepository,
                           ParticipantRepository participantRepository, Clock clock) {
        this.tripRepository = tripRepository;
        this.taskRepository = taskRepository;
        this.participantRepository = participantRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> list(UUID tripId, UUID editToken) {
        if (!tripRepository.existsById(tripId)) {
            throw notFound(tripId);
        }
        UUID callerId = editToken == null ? null
                : participantRepository.findByTripIdAndEditToken(tripId, editToken).map(Participant::getId).orElse(null);
        return taskRepository.findByTripIdOrderByCreatedAtAscIdAsc(tripId).stream()
                .map(task -> TaskResponse.from(task, callerId)).toList();
    }

    @Transactional
    public TaskResponse create(UUID tripId, UUID editToken, String rawTitle) {
        Trip trip = lockTrip(tripId);
        Participant participant = requireParticipant(tripId, editToken);
        requirePlanning(trip);

        String title = cleanTitle(rawTitle);
        if (taskRepository.countByTripId(tripId) >= MAX_TASKS_PER_TRIP) {
            throw new ConflictException("La lista ya tiene el máximo de " + MAX_TASKS_PER_TRIP + " tareas");
        }

        TripTask task = new TripTask();
        task.setTrip(trip);
        task.setTitle(title);
        task.setCreatedAt(LocalDateTime.now(clock));
        // Created by hand: the author is not assigned automatically, anyone can pick it up.
        return TaskResponse.from(taskRepository.save(task), participant.getId());
    }

    @Transactional
    public TaskResponse update(UUID tripId, UUID taskId, UUID editToken, Boolean done, Boolean claimed) {
        Trip trip = lockTrip(tripId);
        Participant participant = requireParticipant(tripId, editToken);
        requirePlanning(trip);

        TripTask task = taskRepository.findById(taskId)
                .filter(t -> t.getTrip().getId().equals(tripId))
                .orElseThrow(() -> new ResourceNotFoundException("Tarea no encontrada: " + taskId));

        if (claimed != null) {
            Participant current = task.getAssignee();
            if (claimed) {
                if (current != null && !current.getId().equals(participant.getId())) {
                    throw new ConflictException("Esta tarea ya la ha reclamado otra persona");
                }
                task.setAssignee(participant);
            } else if (current != null) {
                if (!current.getId().equals(participant.getId())) {
                    throw new ForbiddenException("Solo quien reclamó la tarea puede soltarla");
                }
                task.setAssignee(null);
            }
        }
        if (done != null) {
            task.setDone(done);
        }
        return TaskResponse.from(taskRepository.save(task), participant.getId());
    }

    private Participant requireParticipant(UUID tripId, UUID editToken) {
        if (editToken == null) {
            throw new UnauthorizedException("No se ha podido identificar al participante");
        }
        return participantRepository.findByTripIdAndEditToken(tripId, editToken)
                .orElseThrow(() -> new UnauthorizedException("No se ha podido identificar al participante"));
    }

    private static void requirePlanning(Trip trip) {
        if (trip.getStatus() != TripStatus.PLANNING) {
            throw new ConflictException("La lista de tareas se abre cuando se monta el viaje");
        }
    }

    private static String cleanTitle(String raw) {
        String title = raw == null ? "" : CONTROL_OR_SPACES.matcher(raw).replaceAll(" ").trim();
        if (title.isEmpty()) {
            throw new InvalidRequestException("La tarea no puede estar vacía");
        }
        if (title.length() > MAX_TITLE_LENGTH) {
            throw new InvalidRequestException("La tarea no puede superar los " + MAX_TITLE_LENGTH + " caracteres");
        }
        return title;
    }

    private Trip lockTrip(UUID tripId) {
        return tripRepository.findByIdForUpdate(tripId).orElseThrow(() -> notFound(tripId));
    }

    private static ResourceNotFoundException notFound(UUID tripId) {
        return new ResourceNotFoundException("Trip not found with id: " + tripId);
    }
}
