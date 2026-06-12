"use client";

import { useState } from "react";

export function parseNumberInput(value: string) {
  const cleanedValue = value.replace(/,/g, "");
  let parsedValue = "";
  let hasDecimalSeparator = false;

  for (const character of cleanedValue) {
    if (character >= "0" && character <= "9") {
      parsedValue += character;
      continue;
    }

    if (character === "." && !hasDecimalSeparator) {
      parsedValue += character;
      hasDecimalSeparator = true;
    }
  }

  return parsedValue;
}

export function normalizeNumberInput(value: string) {
  const parsedValue = parseNumberInput(value);

  if (!parsedValue || parsedValue === ".") {
    return "0";
  }

  const [integerPart, decimalPart] = parsedValue.split(".");
  const normalizedInteger = String(Number(integerPart || "0"));

  if (decimalPart !== undefined) {
    const normalizedDecimal = decimalPart.replace(/0+$/, "");

    return normalizedDecimal
      ? `${normalizedInteger}.${normalizedDecimal}`
      : normalizedInteger;
  }

  return normalizedInteger;
}

export function formatNumberInput(value: string) {
  const parsedValue = parseNumberInput(value);

  if (!parsedValue) {
    return "";
  }

  const [integerPart, decimalPart] = parsedValue.split(".");
  const formattedInteger = new Intl.NumberFormat("en-US").format(
    Number(integerPart || "0"),
  );

  if (parsedValue.endsWith(".")) {
    return `${formattedInteger}.`;
  }

  return decimalPart !== undefined
    ? `${formattedInteger}.${decimalPart}`
    : formattedInteger;
}

export function NumberInput({
  label,
  name,
  defaultValue = 0,
  formatThousands = false,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: number;
  formatThousands?: boolean;
  required?: boolean;
}) {
  const normalizedDefaultValue = normalizeNumberInput(String(defaultValue));
  const [rawValue, setRawValue] = useState(normalizedDefaultValue);
  const [displayValue, setDisplayValue] = useState(
    formatThousands
      ? formatNumberInput(normalizedDefaultValue)
      : normalizedDefaultValue,
  );

  function handleChange(value: string) {
    const nextRawValue = parseNumberInput(value);

    setRawValue(nextRawValue);
    setDisplayValue(
      formatThousands ? formatNumberInput(nextRawValue) : nextRawValue,
    );
  }

  function handleFocus() {
    if (Number(rawValue || "0") === 0) {
      setRawValue("");
      setDisplayValue("");
    }
  }

  function handleBlur() {
    const nextRawValue = normalizeNumberInput(rawValue);

    setRawValue(nextRawValue);
    setDisplayValue(
      formatThousands ? formatNumberInput(nextRawValue) : nextRawValue,
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <input type="hidden" name={name} value={rawValue || "0"} />
      <input
        inputMode="decimal"
        required={required}
        value={displayValue}
        onBlur={handleBlur}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={handleFocus}
        className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
      />
    </label>
  );
}
