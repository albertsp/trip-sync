package com.albertsp.tripsync.backend.service.proposal;

import com.albertsp.tripsync.backend.domain.Availability;
import com.albertsp.tripsync.backend.domain.DestinationType;
import com.albertsp.tripsync.backend.domain.Interest;
import com.albertsp.tripsync.backend.domain.Participant;
import com.albertsp.tripsync.backend.domain.Trip;
import com.albertsp.tripsync.backend.domain.TripCurrency;
import com.albertsp.tripsync.backend.service.proposal.BestWindowCalculator.BestWindow;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Everything the code decides about a group before asking the model: the best dates, the
 * currency and the budget figures. Participants without preferences (joined before the feature) are left out.
 */
public record GroupSnapshot(
        String title,
        LocalDate windowStart,
        LocalDate windowEnd,
        int durationDays,
        BestWindow best,
        int participantCount,
        TripCurrency currency,
        BigDecimal minBudget,
        BigDecimal avgBudget,
        List<Row> rows) {

    public static final int DEFAULT_DURATION_DAYS = 4;

    /** One anonymous participant: no name, no email, no id. */
    public record Row(DestinationType destinationType, String originCity, Set<Interest> interests,
                      BigDecimal budget, TripCurrency currency, String notes, Set<LocalDate> days) {
    }

    public static boolean hasPreferences(Participant participant) {
        return participant.getDestinationType() != null;
    }

    public static GroupSnapshot of(Trip trip, List<Participant> participants, List<Availability> availabilities) {
        Map<UUID, Set<LocalDate>> daysByParticipant = new HashMap<>();
        for (Availability a : availabilities) {
            daysByParticipant.computeIfAbsent(a.getParticipant().getId(), id -> new TreeSet<>()).add(a.getDay());
        }

        List<Row> rows = participants.stream()
                .filter(GroupSnapshot::hasPreferences)
                .map(p -> new Row(
                        p.getDestinationType(),
                        p.getOriginCity(),
                        new TreeSet<>(p.getInterests()),
                        p.getBudgetAmount(),
                        p.getBudgetCurrency(),
                        p.getNotes(),
                        daysByParticipant.getOrDefault(p.getId(), Set.of())))
                .toList();

        Map<LocalDate, Integer> availablePerDay = new HashMap<>();
        rows.forEach(r -> r.days().forEach(d -> availablePerDay.merge(d, 1, Integer::sum)));

        int duration = trip.getPreferredDurationDays() == null ? DEFAULT_DURATION_DAYS : trip.getPreferredDurationDays();
        BestWindow best = BestWindowCalculator.find(trip.getWindowStart(), trip.getWindowEnd(), duration, availablePerDay);

        TripCurrency currency = majorityCurrency(rows);
        List<BigDecimal> budgets = rows.stream()
                .filter(r -> r.budget() != null && r.currency() == currency)
                .map(Row::budget)
                .toList();
        BigDecimal min = budgets.stream().min(Comparator.naturalOrder()).orElse(null);
        BigDecimal avg = budgets.isEmpty() ? null
                : budgets.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(budgets.size()), 0, RoundingMode.HALF_UP);

        return new GroupSnapshot(trip.getTitle(), trip.getWindowStart(), trip.getWindowEnd(), duration, best,
                rows.size(), currency, min, avg, rows);
    }

    /** Most used currency among participants with a budget; EUR on a tie or when nobody set a budget. */
    private static TripCurrency majorityCurrency(List<Row> rows) {
        long usd = rows.stream().filter(r -> r.budget() != null && r.currency() == TripCurrency.USD).count();
        long eur = rows.stream().filter(r -> r.budget() != null && r.currency() == TripCurrency.EUR).count();
        return usd > eur ? TripCurrency.USD : TripCurrency.EUR;
    }

    /** People whose budget, in the group currency, is below {@code cost}. Budgets in another currency are not compared. */
    public int overBudgetCount(BigDecimal cost) {
        return (int) rows.stream()
                .filter(r -> r.budget() != null && r.currency() == currency && r.budget().compareTo(cost) < 0)
                .count();
    }

    /** Stable hash of everything that shapes the proposals, independent of participant order. */
    public String inputsHash() {
        String canonical = windowStart + "|" + windowEnd + "|" + durationDays + "|" + currency + "|"
                + rows.stream().map(GroupSnapshot::canonical).sorted().collect(Collectors.joining(";"));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is always available", e);
        }
    }

    private static String canonical(Row r) {
        return r.destinationType() + "," + r.originCity() + "," + r.interests() + ","
                + (r.budget() == null ? "" : r.budget().stripTrailingZeros().toPlainString()) + ","
                + r.currency() + "," + r.notes() + "," + r.days();
    }
}
