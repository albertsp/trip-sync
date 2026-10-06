package com.albertsp.tripsync.backend.service.llm.plan;

import com.albertsp.tripsync.backend.exceptions.InvalidLlmOutputException;
import com.albertsp.tripsync.backend.service.llm.StructuredOutput;
import com.albertsp.tripsync.backend.service.llm.proposal.TextSanitizer;
import jakarta.validation.Validator;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/** Same layers as the proposals parser: strict JSON, sanitising, Bean Validation, then business rules. */
@Component
public class PlanParser {

    private final Validator validator;

    public PlanParser(Validator validator) {
        this.validator = validator;
    }

    /** @param expectedDays days of the winning proposal: the itinerary must have exactly that many, numbered 1..N */
    public PlanDto parse(String raw, int expectedDays) {
        PlanDto parsed = StructuredOutput.read(raw, PlanDto.class);
        PlanDto clean = sanitize(parsed);
        StructuredOutput.validate(validator, clean, raw);
        validateRules(clean, expectedDays, raw);
        return withDistinctTasks(clean);
    }

    private PlanDto sanitize(PlanDto plan) {
        if (plan == null) {
            return null;
        }
        List<PlanDayDto> days = plan.days() == null ? null : plan.days().stream()
                .map(d -> d == null ? null : new PlanDayDto(
                        d.day(),
                        TextSanitizer.clean(d.morning(), PlanDayDto.MAX_PART),
                        TextSanitizer.clean(d.afternoon(), PlanDayDto.MAX_PART),
                        TextSanitizer.clean(d.evening(), PlanDayDto.MAX_PART)))
                .toList();
        return new PlanDto(days, cleanAll(plan.tips(), PlanDto.MAX_TIP), cleanAll(plan.tasks(), PlanDto.MAX_TASK));
    }

    private static List<String> cleanAll(List<String> texts, int max) {
        return texts == null ? null : texts.stream().map(t -> TextSanitizer.clean(t, max)).toList();
    }

    private void validateRules(PlanDto plan, int expectedDays, String raw) {
        if (plan.days().size() != expectedDays) {
            throw new InvalidLlmOutputException(
                    "'days' debe tener exactamente " + expectedDays + " elementos y tiene " + plan.days().size(), raw, null);
        }
        for (int i = 0; i < expectedDays; i++) {
            if (!Objects.equals(plan.days().get(i).day(), i + 1)) {
                throw new InvalidLlmOutputException("Los días deben numerarse en orden: 1, 2, ..., " + expectedDays, raw, null);
            }
        }
    }

    /** Repeated tasks (ignoring case) would clutter the checklist: keep the first of each. */
    private static PlanDto withDistinctTasks(PlanDto plan) {
        Set<String> seen = new HashSet<>();
        List<String> tasks = new ArrayList<>();
        for (String task : plan.tasks()) {
            if (seen.add(task.toLowerCase(Locale.ROOT))) {
                tasks.add(task);
            }
        }
        return new PlanDto(plan.days(), plan.tips(), tasks);
    }
}
