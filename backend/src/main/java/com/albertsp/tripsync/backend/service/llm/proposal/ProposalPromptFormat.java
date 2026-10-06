package com.albertsp.tripsync.backend.service.llm.proposal;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Labels of the group data block of the prompt. The prompt builder writes them and
 * the fake client reads them back, so both stay in sync through this single class.
 */
public final class ProposalPromptFormat {

    public static final String DAYS_LABEL = "DURACION_DIAS";
    public static final String CURRENCY_LABEL = "DIVISA";

    private static final Pattern DAYS = Pattern.compile("^" + DAYS_LABEL + ":\\s*(\\d+)\\s*$", Pattern.MULTILINE);
    private static final Pattern CURRENCY = Pattern.compile("^" + CURRENCY_LABEL + ":\\s*([A-Z]{3})\\s*$", Pattern.MULTILINE);

    private ProposalPromptFormat() {
    }

    public static String daysLine(int days) {
        return DAYS_LABEL + ": " + days;
    }

    public static String currencyLine(String currency) {
        return CURRENCY_LABEL + ": " + currency;
    }

    /** Days declared in the prompt, or {@code fallback} when the line is missing. */
    public static int readDays(String prompt, int fallback) {
        Matcher m = DAYS.matcher(prompt);
        return m.find() ? Integer.parseInt(m.group(1)) : fallback;
    }

    public static String readCurrency(String prompt, String fallback) {
        Matcher m = CURRENCY.matcher(prompt);
        return m.find() ? m.group(1) : fallback;
    }
}
