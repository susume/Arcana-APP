"use strict";
function extractJsonArray(responseText) {
    const match = responseText.match(/\[[\s\S]*?\]/);
    if (!match)
        return [];
    try {
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function normalizeOrientation(value) {
    return String(value || "").toLowerCase().includes("reversed") ? "reversed" : "upright";
}
function normalizeName(value) {
    return value.trim().replace(/\s+/g, " ");
}
function buildKnownCards(cardReferences) {
    const known = new Map();
    (cardReferences || []).forEach((card) => {
        if (!card.name)
            return;
        const name = normalizeName(card.name);
        known.set(name.toLowerCase(), name);
    });
    return known;
}
function parseIdentifiedCards(responseText, cardReferences) {
    const knownCards = buildKnownCards(cardReferences);
    const results = {};
    extractJsonArray(responseText).forEach((item) => {
        if (!item.card || !item.position)
            return;
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
