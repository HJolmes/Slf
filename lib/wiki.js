// Prüft mittels Wikipedia REST API, ob ein Wort existiert.
// Nutzt In-Memory-Cache, da Wikipedia-Lemmata sich praktisch nicht ändern.

const cache = new Map();

const USER_AGENT = 'StadtLandFluss/1.x (https://github.com/HJolmes/Slf)';
const FETCH_TIMEOUT_MS = 4000;

async function checkWikipediaExists(term) {
  if (!term || typeof term !== 'string') return null;
  const key = term.toLowerCase().trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  // Wikipedia mag den Lemma-Titel mit Großbuchstaben am Anfang.
  // 'Berlin' und 'berlin' werden automatisch normalisiert -> Redirect zum richtigen Lemma.
  const url = `https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.trim())}`;

  let timeoutId;
  const controller = new AbortController();
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, FETCH_TIMEOUT_MS);
  });

  try {
    const fetchPromise = fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: controller.signal
    });
    const res = await Promise.race([fetchPromise, timeout]);
    clearTimeout(timeoutId);
    // 200 = Artikel oder Disambiguation-Seite existiert -> Begriff bekannt
    // 404 = kein Artikel -> Begriff unbekannt
    if (res.status === 200) {
      cache.set(key, true);
      return true;
    }
    if (res.status === 404) {
      cache.set(key, false);
      return false;
    }
    return null;
  } catch (err) {
    clearTimeout(timeoutId);
    return null; // Netzwerkfehler / Timeout -> unbekannt, defensiv "gültig"
  }
}

module.exports = { checkWikipediaExists };
