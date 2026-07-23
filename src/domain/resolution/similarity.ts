const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "about", "above", "after", "again", "against",
  "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been",
  "before", "being", "below", "between", "both", "by", "can't", "cannot", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each",
  "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't",
  "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
  "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in",
  "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most",
  "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
  "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
  "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than",
  "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
  "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those",
  "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd",
  "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
  "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
  "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your",
  "yours", "yourself", "yourselves", "inc", "corp", "co", "ltd", "llc"
]);

const SYNONYMS: Record<string, string> = {
  evs: "electric vehicle",
  ev: "electric vehicle",
  "500k": "500000",
  "100k": "100000",
  "1m": "1000000",
  "8k": "sec filing",
  "10k": "sec filing",
};

export function stemWord(word: string): string {
  const w = word.toLowerCase();
  if (SYNONYMS[w]) return SYNONYMS[w];

  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 3 && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function normalizeHeadlineTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .flatMap((w) => stemWord(w).split(" "));
}

export function calculateTokenJaccard(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  if (set1.size === 0 || set2.size === 0) return 0;

  let intersection = 0;
  set1.forEach((t) => {
    if (set2.has(t)) intersection++;
  });

  const union = new Set([...set1, ...set2]).size;
  return union > 0 ? intersection / union : 0;
}

export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeHeadlineTokens(str1).join(" ");
  const norm2 = normalizeHeadlineTokens(str2).join(" ");

  if (norm1 === norm2) return 1.0;
  if (norm1.length === 0 || norm2.length === 0) return 0.0;

  const len1 = norm1.length;
  const len2 = norm2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen > 0 ? 1.0 - distance / maxLen : 0.0;
}

export function calculateHeadlineSimilarity(h1: string, h2: string): number {
  const tokens1 = normalizeHeadlineTokens(h1);
  const tokens2 = normalizeHeadlineTokens(h2);

  const jaccard = calculateTokenJaccard(tokens1, tokens2);
  const lev = calculateLevenshteinSimilarity(h1, h2);

  return jaccard * 0.7 + lev * 0.3;
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url.toLowerCase().trim();
  }
}
