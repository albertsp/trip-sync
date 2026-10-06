package com.albertsp.tripsync.backend.service.llm;

import com.albertsp.tripsync.backend.service.llm.plan.PlanSchemas;
import com.albertsp.tripsync.backend.service.llm.proposal.ProposalPromptFormat;
import com.albertsp.tripsync.backend.service.llm.proposal.ProposalSchemas;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Deterministic client for development, tests and e2e. Only active with {@code LLM_PROVIDER=fake},
 * so real environments can never serve invented data by accident.
 */
public class FakeLlmClient implements LlmClient {

    private static final int DEFAULT_DAYS = 4;
    private static final int[][] COSTS = {{60, 70, 40, 15}, {45, 55, 35, 10}, {110, 120, 70, 40}};
    private static final String[][] DESTINATIONS = {
            {"CONSENSUS", "Sierra de Guadarrama", "España", "92"},
            {"BUDGET", "Valencia", "España", "81"},
            {"AMBITIOUS", "Lisboa", "Portugal", "74"}
    };

    private final JsonMapper mapper = JsonMapper.builder().build();

    @Override
    public LlmResult complete(String systemInstruction, String userContent, LlmSchema schema) {
        int days = ProposalPromptFormat.readDays(userContent, DEFAULT_DAYS);
        String json = switch (schema.name()) {
            case ProposalSchemas.PROPOSALS_NAME -> proposalsJson(days, ProposalPromptFormat.readCurrency(userContent, "EUR"));
            case PlanSchemas.PLAN_NAME -> planJson(days);
            default -> throw new IllegalArgumentException("FakeLlmClient does not know the schema " + schema.name());
        };
        return new LlmResult(json, "stop", LlmUsage.NONE);
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public String model() {
        return "fake";
    }

    private String planJson(int days) {
        ObjectNode root = mapper.createObjectNode();
        ArrayNode dayNodes = root.putArray("days");
        for (int day = 1; day <= days; day++) {
            ObjectNode d = dayNodes.addObject();
            d.put("day", day);
            d.put("morning", "Desayuno tranquilo y paseo por el centro (día " + day + ").");
            d.put("afternoon", "Comida local y actividad principal del día " + day + ".");
            d.put("evening", "Cena en grupo y tiempo libre.");
        }
        root.putArray("tips").add("Reservad el alojamiento cuanto antes.").add("Llevad calzado cómodo.");
        root.putArray("tasks").add("Reservar alojamiento").add("Organizar el transporte desde cada ciudad")
                .add("Decidir quién lleva el coche").add("Reservar mesa para la cena del primer día");
        return mapper.writeValueAsString(root);
    }

    private String proposalsJson(int days, String currency) {
        ObjectNode root = mapper.createObjectNode();
        ArrayNode proposals = root.putArray("proposals");
        for (int i = 0; i < DESTINATIONS.length; i++) {
            String[] d = DESTINATIONS[i];
            ObjectNode p = proposals.addObject();
            p.put("angle", d[0]);
            p.put("destination", d[1]);
            p.put("country", d[2]);
            p.put("fitScore", Integer.parseInt(d[3]));
            p.put("whyFits", "Encaja con las fechas, el presupuesto y los intereses del grupo.");
            p.put("tradeoffs", "Renuncia a parte de las preferencias de algunas personas.");
            ArrayNode dayLines = p.putArray("days");
            for (int day = 1; day <= days; day++) {
                dayLines.add("Día " + day + ": plan en " + d[1]);
            }
            ObjectNode cost = p.putObject("costBreakdown");
            cost.put("transport", COSTS[i][0]);
            cost.put("lodging", COSTS[i][1]);
            cost.put("food", COSTS[i][2]);
            cost.put("activities", COSTS[i][3]);
            p.put("currency", currency);
        }
        return mapper.writeValueAsString(root);
    }
}
