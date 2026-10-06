package com.albertsp.tripsync.backend.service.llm.proposal;

import com.albertsp.tripsync.backend.domain.ProposalAngle;
import com.albertsp.tripsync.backend.exceptions.InvalidLlmOutputException;
import com.albertsp.tripsync.backend.service.llm.StructuredOutput;
import jakarta.validation.Validator;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Turns the raw model text into a trusted {@link ProposalsDto}. Layers: strict Jackson,
 * sanitising of text, Bean Validation, then business rules. Any failure is an
 * {@link InvalidLlmOutputException} whose message is safe to feed back to the model on retry.
 */
@Component
public class ProposalsParser {

    private static final Pattern ACCENTS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    private final Validator validator;

    public ProposalsParser(Validator validator) {
        this.validator = validator;
    }

    public ProposalsDto parse(String raw, ProposalsContext context) {
        ProposalsDto parsed = StructuredOutput.read(raw, ProposalsDto.class);
        ProposalsDto clean = sanitize(parsed);
        validateStructure(clean, raw);
        validateRules(clean, context, raw);
        return clean;
    }

    private ProposalsDto sanitize(ProposalsDto dto) {
        if (dto == null || dto.proposals() == null) {
            return dto;
        }
        List<ProposalDto> cleaned = new ArrayList<>();
        for (ProposalDto p : dto.proposals()) {
            cleaned.add(p == null ? null : sanitize(p));
        }
        return new ProposalsDto(cleaned);
    }

    private ProposalDto sanitize(ProposalDto p) {
        List<String> days = p.days() == null ? null : p.days().stream()
                .map(d -> TextSanitizer.clean(d, ProposalDto.MAX_DAY))
                .collect(Collectors.toList());
        return new ProposalDto(
                p.angle(),
                TextSanitizer.clean(p.destination(), ProposalDto.MAX_DESTINATION),
                TextSanitizer.clean(p.country(), ProposalDto.MAX_COUNTRY),
                p.fitScore(),
                TextSanitizer.clean(p.whyFits(), ProposalDto.MAX_WHY_FITS),
                TextSanitizer.clean(p.tradeoffs(), ProposalDto.MAX_TRADEOFFS),
                days,
                p.costBreakdown(),
                p.currency());
    }

    private void validateStructure(ProposalsDto dto, String raw) {
        StructuredOutput.validate(validator, dto, raw);
    }

    private void validateRules(ProposalsDto dto, ProposalsContext context, String raw) {
        List<ProposalDto> proposals = dto.proposals();

        Set<ProposalAngle> angles = EnumSet.noneOf(ProposalAngle.class);
        proposals.forEach(p -> angles.add(p.angle()));
        if (angles.size() != ProposalAngle.values().length) {
            throw new InvalidLlmOutputException("Debe haber exactamente una propuesta por ángulo: CONSENSUS, BUDGET y AMBITIOUS", raw, null);
        }

        Set<String> destinations = new HashSet<>();
        for (ProposalDto p : proposals) {
            if (!destinations.add(normalize(p.destination()))) {
                throw new InvalidLlmOutputException("Los 3 destinos deben ser distintos", raw, null);
            }
            if (p.days().size() != context.expectedDays()) {
                throw new InvalidLlmOutputException(
                        "'" + p.destination() + "' debe tener exactamente " + context.expectedDays()
                                + " días en 'days' y tiene " + p.days().size(), raw, null);
            }
            if (!context.currency().equals(p.currency())) {
                throw new InvalidLlmOutputException(
                        "La divisa de '" + p.destination() + "' debe ser " + context.currency(), raw, null);
            }
            if (p.costBreakdown().total().signum() <= 0) {
                throw new InvalidLlmOutputException("El coste de '" + p.destination() + "' no puede ser 0", raw, null);
            }
        }
    }

    private static String normalize(String text) {
        String decomposed = Normalizer.normalize(text, Normalizer.Form.NFD);
        return ACCENTS.matcher(decomposed).replaceAll("").toLowerCase(Locale.ROOT).trim();
    }
}
