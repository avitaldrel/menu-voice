export interface ExtractedMarkers {
  allergies: string[];
  dislikes: string[];
  preferences: string[];
}

export function parseAllergyMarkers(text: string): ExtractedMarkers {
  // Create fresh regex instances inside the function to avoid stale lastIndex state
  // with global flag (/g) — a regex with /g reuses lastIndex across calls if reused
  const allergyRe = /\[ALLERGY:([^\]]+)\]/gi;
  const dislikeRe = /\[DISLIKE:([^\]]+)\]/gi;
  const preferenceRe = /\[PREFERENCE:([^\]]+)\]/gi;

  const allergies: string[] = [];
  const dislikes: string[] = [];
  const preferences: string[] = [];

  let match;
  while ((match = allergyRe.exec(text)) !== null) allergies.push(match[1].toLowerCase());
  while ((match = dislikeRe.exec(text)) !== null) dislikes.push(match[1].toLowerCase());
  while ((match = preferenceRe.exec(text)) !== null) preferences.push(match[1].toLowerCase());

  return { allergies, dislikes, preferences };
}

export function stripMarkers(text: string): string {
  return text
    .replace(/\[ALLERGY:[^\]]+\]/gi, '')
    .replace(/\[DISLIKE:[^\]]+\]/gi, '')
    .replace(/\[PREFERENCE:[^\]]+\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1') // remove space before punctuation left by stripped markers
    .trim();
}
