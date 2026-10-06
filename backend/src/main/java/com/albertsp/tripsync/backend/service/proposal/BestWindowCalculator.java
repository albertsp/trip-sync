package com.albertsp.tripsync.backend.service.proposal;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Finds the stretch of days of a given length where the most people are available. */
public final class BestWindowCalculator {

    private BestWindowCalculator() {
    }

    /** {@code score} is the sum, over the days of the stretch, of people available that day. */
    public record BestWindow(LocalDate start, LocalDate end, int score) {

        public int days() {
            return (int) (end.toEpochDay() - start.toEpochDay()) + 1;
        }
    }

    /**
     * Sliding window over {@code windowStart..windowEnd}. The highest score wins and ties go to the earliest
     * start. If the trip window is not longer than {@code duration}, the whole window is returned.
     */
    public static BestWindow find(LocalDate windowStart, LocalDate windowEnd, int duration, Map<LocalDate, Integer> availablePerDay) {
        List<LocalDate> days = windowStart.datesUntil(windowEnd.plusDays(1)).toList();
        int length = Math.min(duration, days.size());

        int current = 0;
        for (int i = 0; i < length; i++) {
            current += availablePerDay.getOrDefault(days.get(i), 0);
        }
        int bestScore = current;
        int bestIndex = 0;

        for (int start = 1; start + length <= days.size(); start++) {
            current -= availablePerDay.getOrDefault(days.get(start - 1), 0);
            current += availablePerDay.getOrDefault(days.get(start + length - 1), 0);
            if (current > bestScore) {
                bestScore = current;
                bestIndex = start;
            }
        }

        return new BestWindow(days.get(bestIndex), days.get(bestIndex + length - 1), bestScore);
    }
}
