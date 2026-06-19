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
function normalizeAllowedPosition(value) {
    if (typeof value !== "string" && typeof value !== "number")
        return null;
    const normalized = String(value).trim();
    return /^[1-9]\d*$/.test(normalized) ? normalized : null;
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
function isPlayingDeck(knownCards) {
    return Array.from(knownCards.keys()).some((name) => /\b(?:hearts|diamonds|clubs|spades)$/.test(name));
}
function normalizePlayingCardName(value) {
    const match = value.match(/^(.+?)\s+of\s+(.+)$/i);
    if (!match)
        return null;
    const rankAliases = {
        "1": "Ace",
        "2": "Two",
        "3": "Three",
        "4": "Four",
        "5": "Five",
        "6": "Six",
        "7": "Seven",
        "8": "Eight",
        "9": "Nine",
        "10": "Ten",
        ace: "Ace",
        two: "Two",
        three: "Three",
        four: "Four",
        five: "Five",
        six: "Six",
        seven: "Seven",
        eight: "Eight",
        nine: "Nine",
        ten: "Ten",
        jack: "Jack",
        page: "Jack",
        queen: "Queen",
        king: "King"
    };
    const suitAliases = {
        hearts: "Hearts",
        cups: "Hearts",
        diamonds: "Diamonds",
        pentacles: "Diamonds",
        clubs: "Clubs",
        wands: "Clubs",
        spades: "Spades",
        swords: "Spades"
    };
    const rank = rankAliases[match[1].trim().toLowerCase()];
    const suit = suitAliases[match[2].trim().toLowerCase()];
    return rank && suit ? `${rank} of ${suit}` : null;
}
function parseIdentifiedCards(responseText, cardReferences, allowedPositions) {
    const knownCards = buildKnownCards(cardReferences);
    const playingDeck = isPlayingDeck(knownCards);
    const allowedPositionSet = allowedPositions
        ? new Set(allowedPositions.map(normalizeAllowedPosition).filter((value) => !!value))
        : null;
    const results = {};
    extractJsonArray(responseText).forEach((value) => {
        if (!value || typeof value !== "object")
            return;
        const item = value;
        if (typeof item.card !== "string" || !item.card || !item.position)
            return;
        const position = allowedPositionSet ? normalizeAllowedPosition(item.position) : String(item.position);
        if (!position || (allowedPositionSet && !allowedPositionSet.has(position)))
            return;
        const normalized = normalizeName(item.card);
        const exact = knownCards.get(normalized.toLowerCase());
        const playingAlias = playingDeck ? normalizePlayingCardName(normalized) : null;
        const canonical = exact || (playingAlias && knownCards.get(playingAlias.toLowerCase()));
        if (!canonical)
            return;
        results[position] = {
            name: canonical,
            orientation: normalizeOrientation(item.orientation)
        };
    });
    return results;
}
window.ArcanaAI = {
    parseIdentifiedCards
};
