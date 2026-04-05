function sentenceCase(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function humanizeIdentifier(value: string) {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((token) => {
      if (/^[A-Z0-9]{2,}$/.test(token)) {
        return token;
      }

      return token.toLowerCase();
    })
    .join(" ");
}

function withPeriod(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

export function formatConditionForDisplay(
  condition: string | null | undefined,
  fallback = "Runs whenever the workflow reaches this approval stage.",
) {
  const value = condition?.trim();

  if (!value) {
    return fallback;
  }

  const normalized = value.replace(/^if\s+/i, "").trim();

  const existsMatch = normalized.match(/^(.*?)(?:\.?Exists)\s*==\s*(true|false)$/i);
  if (existsMatch) {
    const subject = humanizeIdentifier(existsMatch[1]);
    const exists = existsMatch[2].toLowerCase() === "true";

    return withPeriod(
      sentenceCase(
        `Only if ${subject} ${exists ? "exists" : "does not exist"}`,
      ),
    );
  }

  const comparisonPatterns: Array<[RegExp, (left: string, right: string) => string]> = [
    [/^(.*?)\s*>=\s*(.+)$/i, (left, right) => `Only if ${left} is at least ${right}`],
    [/^(.*?)\s*<=\s*(.+)$/i, (left, right) => `Only if ${left} is no more than ${right}`],
    [/^(.*?)\s*>\s*(.+)$/i, (left, right) => `Only if ${left} is greater than ${right}`],
    [/^(.*?)\s*<\s*(.+)$/i, (left, right) => `Only if ${left} is less than ${right}`],
    [/^(.*?)\s*!=\s*(.+)$/i, (left, right) => `Only if ${left} is not ${right}`],
    [/^(.*?)\s*==\s*true$/i, (left) => `Only if ${left} is marked yes`],
    [/^(.*?)\s*==\s*false$/i, (left) => `Only if ${left} is marked no`],
    [/^(.*?)\s*==\s*(.+)$/i, (left, right) => `Only if ${left} is ${right}`],
  ];

  for (const [pattern, template] of comparisonPatterns) {
    const match = normalized.match(pattern);
    if (!match) {
      continue;
    }

    const left = humanizeIdentifier(match[1]);
    const right = humanizeIdentifier(match[2] ?? "");

    return withPeriod(sentenceCase(template(left, right)));
  }

  return withPeriod(sentenceCase(value));
}
