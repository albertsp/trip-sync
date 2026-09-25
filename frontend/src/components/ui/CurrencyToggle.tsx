import { useId } from "react";
import type { ChangeEvent } from "react";
import type { TripCurrency } from "../../types";

const CURRENCIES: TripCurrency[] = ["EUR", "USD"];

interface CurrencyToggleProps {
  name: string;
  value: TripCurrency;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** Segmented EUR / USD control: real radios underneath, so keyboard and screen readers work. */
export function CurrencyToggle({ name, value, onChange }: CurrencyToggleProps) {
  const labelId = useId();

  return (
    <div className="field">
      <span id={labelId} className="field-label-text">
        Divisa
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={labelId}>
        {CURRENCIES.map((currency) => (
          <label key={currency}>
            <input
              type="radio"
              name={name}
              value={currency}
              checked={value === currency}
              onChange={onChange}
            />
            <span>{currency}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
