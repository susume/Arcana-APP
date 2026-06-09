type ArcanaOrientation = "upright" | "reversed";

interface ArcanaCardReference {
  name?: string;
}

interface GeminiCardIdentification {
  position?: string | number;
  card?: string | null;
  orientation?: string | null;
}

interface ArcanaIdentifiedCard {
  name: string;
  orientation: ArcanaOrientation;
}

interface ArcanaAI {
  parseIdentifiedCards(
    responseText: string,
    cardReferences?: ArcanaCardReference[]
  ): Record<string, ArcanaIdentifiedCard>;
}

interface Window {
  ArcanaAI?: ArcanaAI;
}

function extractJsonArray(responseText: string): GeminiCardIdentification[] {
  const match = responseText.match(/\[[\s\S]*?\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeOrientation(value?: string | null): ArcanaOrientation {
  return String(value || "").toLowerCase().includes("reversed") ? "reversed" : "upright";
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildKnownCards(cardReferences?: ArcanaCardReference[]): Map<string, string> {
  const known = new Map<string, string>();
  (cardReferences || []).forEach((card) => {
    if (!card.name) return;
    const name = normalizeName(card.name);
    known.set(name.toLowerCase(), name);
  });
  return known;
}

function parseIdentifiedCards(
  responseText: string,
  cardReferences?: ArcanaCardReference[]
): Record<string, ArcanaIdentifiedCard> {
  const knownCards = buildKnownCards(cardReferences);
  const results: Record<string, ArcanaIdentifiedCard> = {};

  extractJsonArray(responseText).forEach((item) => {
    if (!item.card || !item.position) return;

    const normalized = normalizeName(item.card);
    const canonical = knownCards.get(normalized.toLowerCase()) || normalized;
    results[String(item.position)] = {
      name: canonical,
      orientation: normalizeOrientation(item.orientation)
    };
  });

  return results;
}

window.ArcanaAI = {
  parseIdentifiedCards
};
