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

// Damerau-Levenshtein: zählt Buchstaben-Vertauschungen (z. B. "Hnud"→"Hund") als 1 Edit
function damerau(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

function threshold(len) {
  if (len <= 5) return 1;       // bis 5 Zeichen: 1 Tippfehler
  if (len <= 8) return 2;       // bis 8 Zeichen: 2 Tippfehler
  return 3;                     // länger: bis 3 Tippfehler
}

// Liefert: { status, normalized, corrected }
//   status: 'ok' | 'corrected' | 'unknown' | 'wrong-letter' | 'empty'
//   normalized: kanonische Schreibweise aus dem Wörterbuch (bei 'ok'/'corrected'), sonst Eingabe
//   corrected: true, wenn Eingabe ungleich normalized
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

  // Nur Einträge mit passendem Anfangsbuchstaben prüfen
  let best = null;
  let bestDist = Infinity;
  for (const entry of dict) {
    if (normalizeLetter(entry.charAt(0)) !== roundLetter) continue;
    const cand = normalizeForCompare(entry);
    if (!cand) continue;
    if (cand === target) {
      return { status: raw === entry ? 'ok' : 'corrected', normalized: entry, corrected: raw !== entry };
    }
    // Längen-Vorfilter für Performance
    if (Math.abs(cand.length - target.length) > 3) continue;
    const d = damerau(cand, target);
    if (d < bestDist) {
      bestDist = d;
      best = entry;
    }
  }

  if (best && bestDist <= threshold(target.length)) {
    return { status: 'corrected', normalized: best, corrected: true };
  }

  return { status: 'unknown', normalized: raw, corrected: false };
}

module.exports = { validateAnswer, normalizeLetter };
