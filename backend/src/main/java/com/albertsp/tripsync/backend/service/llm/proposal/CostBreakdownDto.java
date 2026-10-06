package com.albertsp.tripsync.backend.service.llm.proposal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** Cost per person in the group's currency, as estimated by the model. The total is always computed in code. */
public record CostBreakdownDto(
        @NotNull @DecimalMin("0") @DecimalMax(CostBreakdownDto.MAX_ITEM) BigDecimal transport,
        @NotNull @DecimalMin("0") @DecimalMax(CostBreakdownDto.MAX_ITEM) BigDecimal lodging,
        @NotNull @DecimalMin("0") @DecimalMax(CostBreakdownDto.MAX_ITEM) BigDecimal food,
        @NotNull @DecimalMin("0") @DecimalMax(CostBreakdownDto.MAX_ITEM) BigDecimal activities) {

    public static final String MAX_ITEM = "20000";

    public BigDecimal total() {
        return transport.add(lodging).add(food).add(activities);
    }
}
