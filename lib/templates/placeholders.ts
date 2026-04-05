const placeholderPattern = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function extractTemplatePlaceholdersFromHtml(html: string) {
  const matches = html.matchAll(placeholderPattern);
  const values = new Set<string>();

  for (const match of matches) {
    const key = match[1]?.trim();
    if (key) {
      values.add(key);
    }
  }

  return Array.from(values);
}

export function applyTemplatePlaceholders(
  html: string,
  values: Record<string, string | undefined>,
) {
  return html.replace(placeholderPattern, (_, key: string) => {
    const normalizedKey = key.trim();
    const value = values[normalizedKey];
    return typeof value === "string" && value.trim() ? value.trim() : `{{${normalizedKey}}}`;
  });
}
