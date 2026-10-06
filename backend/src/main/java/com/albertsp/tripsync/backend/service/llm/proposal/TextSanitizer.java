package com.albertsp.tripsync.backend.service.llm.proposal;

import java.util.regex.Pattern;

/**
 * Cleans model-generated text before it reaches the UI: React escapes HTML, but a generated
 * link would still render as a phishing vector, so URLs and markup are removed.
 */
public final class TextSanitizer {

    private static final Pattern MARKDOWN_LINK = Pattern.compile("\\[([^\\]]*)]\\([^)]*\\)");
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]{0,200}>");
    private static final Pattern URL = Pattern.compile("(?i)\\b(?:https?://|www\\.)\\S+");
    private static final Pattern ANGLE_BRACKETS = Pattern.compile("[<>]");
    private static final Pattern WHITESPACE_OR_CONTROL = Pattern.compile("[\\p{Cntrl}\\s]+");

    private TextSanitizer() {
    }

    /** Removes links, markup and control characters, collapses whitespace and cuts to {@code maxLength}. */
    public static String clean(String text, int maxLength) {
        if (text == null) {
            return null;
        }
        String cleaned = MARKDOWN_LINK.matcher(text).replaceAll("$1");
        cleaned = HTML_TAG.matcher(cleaned).replaceAll(" ");
        cleaned = URL.matcher(cleaned).replaceAll(" ");
        cleaned = ANGLE_BRACKETS.matcher(cleaned).replaceAll("");
        cleaned = WHITESPACE_OR_CONTROL.matcher(cleaned).replaceAll(" ").trim();
        if (cleaned.length() > maxLength) {
            cleaned = cleaned.substring(0, maxLength - 1).trim() + "…";
        }
        return cleaned;
    }
}
