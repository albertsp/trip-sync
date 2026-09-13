import { useState } from "react";

interface CopyLinkFieldProps {
  id: string;
  label: string;
  value: string;
}

export function CopyLinkField({ id, label, value }: CopyLinkFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("No se pudo copiar el enlace: ", error);
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="copy-field">
        <input
          id={id}
          type="text"
          readOnly
          value={value}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="copy-btn" onClick={handleCopy}>
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
