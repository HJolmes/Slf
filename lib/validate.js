const { getDictionary } = require('./dictionaries');

function normalizeLetter(c) {
  c = (c || '').toString().toUpperCase();
  if (c === 'Ä') return 'A';
  if (c === 'Ö') return 'O';
  if (c === 'Ü') return 'U';
  return c;
}

function normalizeForCompare(s) {
  return (s || '').toString()
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();
}

// Liefert: { status, normalized, corrected }
//   status: 'ok' | 'unknown' | 'wrong-letter' | 'empty'
//   normalized: Eingabe (Original-Schreibweise des Spielers)
//   corrected: immer false (Auto-Korrektur ist deaktiviert)
//
// Die Antwort wird NICHT mehr automatisch auf eine kanonische Schreibweise
// gemappt — der Spieler sieht seine Eingabe genau wie er sie geschrieben hat.
// Es wird nur geprüft, ob die Antwort genau im Wörterbuch steht (case-insensitiv
// und ohne Umlaut-Unterschiede), damit ein gruener Haken vergeben werden kann.
function validateAnswer(category, letter, answer) {
  const raw = (answer || '').toString().trim();
  if (!raw) return { status: 'empty', normalized: '', corrected: false };

  const roundLetter = normalizeLetter(letter);
  const firstLetter = normalizeLetter(raw.charAt(0));
  if (roundLetter && firstLetter !== roundLetter) {
    return { status: 'wrong-letter', normalized: raw, corrected: false };
  }

  const dict = getDictionary(category);
  if (!dict) {
    // Keine Standard-Kategorie: kein Wörterbuch -> als unbekannt-aber-gültig markieren
    return { status: 'unknown', normalized: raw, corrected: false };
  }

  const target = normalizeForCompare(raw);
  if (!target) return { status: 'unknown', normalized: raw, corrected: false };

  for (const entry of dict) {
    if (normalizeLetter(entry.charAt(0)) !== roundLetter) continue;
    const cand = normalizeForCompare(entry);
    if (cand && cand === target) {
      return { status: 'ok', normalized: raw, corrected: false };
    }
  }

  return { status: 'unknown', normalized: raw, corrected: false };
}

module.exports = { validateAnswer, normalizeLetter };
