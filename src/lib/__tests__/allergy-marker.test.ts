import { describe, it, expect } from 'vitest';
import { parseAllergyMarkers, stripMarkers } from '@/lib/allergy-marker';

describe('parseAllergyMarkers', () => {
  it('Test 1: extracts a single [ALLERGY:shellfish] from text', () => {
    const result = parseAllergyMarkers('This dish contains [ALLERGY:shellfish] and should be avoided.');
    expect(result.allergies).toEqual(['shellfish']);
    expect(result.dislikes).toEqual([]);
    expect(result.preferences).toEqual([]);
  });

  it('Test 2: extracts multiple [ALLERGY:dairy] and [ALLERGY:nuts] from same text', () => {
    const result = parseAllergyMarkers('Watch out for [ALLERGY:dairy] and [ALLERGY:nuts] in this dish.');
    expect(result.allergies).toEqual(['dairy', 'nuts']);
  });

  it('Test 3: extracts [DISLIKE:cilantro] into dislikes array', () => {
    const result = parseAllergyMarkers('This has [DISLIKE:cilantro] which you may not enjoy.');
    expect(result.dislikes).toEqual(['cilantro']);
    expect(result.allergies).toEqual([]);
    expect(result.preferences).toEqual([]);
  });

  it('Test 4: extracts [PREFERENCE:spicy] into preferences array', () => {
    const result = parseAllergyMarkers('You like [PREFERENCE:spicy] food — this dish is perfect.');
    expect(result.preferences).toEqual(['spicy']);
    expect(result.allergies).toEqual([]);
    expect(result.dislikes).toEqual([]);
  });

  it('Test 5: extracts mixed markers from same text', () => {
    const text = 'This contains [ALLERGY:dairy] and [DISLIKE:olives] but is [PREFERENCE:vegetarian].';
    const result = parseAllergyMarkers(text);
    expect(result.allergies).toEqual(['dairy']);
    expect(result.dislikes).toEqual(['olives']);
    expect(result.preferences).toEqual(['vegetarian']);
  });

  it('Test 6: returns empty arrays when no markers present', () => {
    const result = parseAllergyMarkers('This is just a plain description with no markers.');
    expect(result.allergies).toEqual([]);
    expect(result.dislikes).toEqual([]);
    expect(result.preferences).toEqual([]);
  });

  it('Test 7: is case-insensitive (matches [allergy:Dairy] and [ALLERGY:dairy])', () => {
    const result1 = parseAllergyMarkers('Contains [allergy:Dairy].');
    expect(result1.allergies).toContain('dairy');

    const result2 = parseAllergyMarkers('Contains [ALLERGY:dairy].');
    expect(result2.allergies).toContain('dairy');
  });

  it('Test 8: lowercases extracted values ("Shellfish" becomes "shellfish")', () => {
    const result = parseAllergyMarkers('Contains [ALLERGY:Shellfish].');
    expect(result.allergies).toEqual(['shellfish']);
  });

  it('Test 12: works correctly when called multiple times (no stale regex state)', () => {
    const text = 'Contains [ALLERGY:gluten].';
    const result1 = parseAllergyMarkers(text);
    const result2 = parseAllergyMarkers(text);
    const result3 = parseAllergyMarkers(text);
    expect(result1.allergies).toEqual(['gluten']);
    expect(result2.allergies).toEqual(['gluten']);
    expect(result3.allergies).toEqual(['gluten']);
  });
});

describe('stripMarkers', () => {
  it('Test 9: removes all markers and returns clean text', () => {
    const text = 'This dish [ALLERGY:dairy] is creamy [DISLIKE:olives] with olives [PREFERENCE:vegetarian].';
    const result = stripMarkers(text);
    expect(result).not.toContain('[ALLERGY:');
    expect(result).not.toContain('[DISLIKE:');
    expect(result).not.toContain('[PREFERENCE:');
    expect(result).toBe('This dish is creamy with olives.');
  });

  it('Test 10: handles text with no markers (returns text unchanged)', () => {
    const text = 'Plain description with no markers.';
    const result = stripMarkers(text);
    expect(result).toBe(text);
  });

  it('Test 11: removes trailing markers cleanly (no extra whitespace)', () => {
    const text = 'This dish is delicious [ALLERGY:nuts]';
    const result = stripMarkers(text);
    expect(result).toBe('This dish is delicious');
    expect(result).not.toMatch(/\s+$/);
  });
});
