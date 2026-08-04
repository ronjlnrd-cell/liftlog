function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(text: string): string {
  return normalizeSearchText(text).replace(/\s/g, "");
}

function fuzzyCompactSearchText(text: string): string {
  return compactSearchText(text).replace(/(.)\1+/g, "$1");
}

function fieldMatchesQuery(query: string, field: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  const compactQuery = compactSearchText(query);
  const fuzzyQuery = fuzzyCompactSearchText(query);

  const normalizedField = normalizeSearchText(field);
  const compactField = compactSearchText(field);
  const fuzzyField = fuzzyCompactSearchText(field);

  if (normalizedField.includes(normalizedQuery)) return true;
  if (compactField.includes(compactQuery)) return true;
  if (fuzzyField.includes(fuzzyQuery)) return true;

  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  if (queryWords.length <= 1) return false;

  return queryWords.every(
    (word) =>
      normalizedField.includes(word) ||
      fuzzyField.includes(fuzzyCompactSearchText(word)),
  );
}

export function matchesExerciseSearch(query: string, ...fields: string[]): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  return fields.some((field) => fieldMatchesQuery(trimmed, field));
}
