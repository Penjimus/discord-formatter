// Aperçu lisible d'un horodatage à gauche (S8c), comparé à l'affichage français de Discord (H1, docs/discord-rules.md §8).
import { describe, expect, it } from 'vitest';
import { timestampPreview } from '../../src/core/timestampPreview';

const NEW_YEAR_2025 = 1735689600; // 1er janvier 2025 à 00h00 UTC, 01h00 à Paris
const PARIS = 'Europe/Paris';

describe('H1 : les neuf styles et l\'absence de style, à Paris', () => {
  const cases: [string | null, string][] = [
    [null, '1 janvier 2025 01:00'],
    ['t', '01:00'],
    ['T', '01:00:00'],
    ['d', '01/01/2025'],
    ['D', '1 janvier 2025'],
    ['f', '1 janvier 2025 01:00'],
    ['F', 'mercredi 1 janvier 2025 01:00'],
    ['s', '01/01/2025, 01:00'],
    ['S', '01/01/2025, 01:00:00'],
  ];
  for (const [style, expected] of cases) {
    it(`style ${style ?? 'aucun'} → ${expected}`, () => {
      expect(timestampPreview(NEW_YEAR_2025, style as never, { timeZone: PARIS })).toBe(expected);
    });
  }
});

describe('H1 : temps relatif (R)', () => {
  const now = new Date(NEW_YEAR_2025 * 1000);
  const after = (seconds: number) => timestampPreview(NEW_YEAR_2025 + seconds, 'R', { timeZone: PARIS, now });

  it('dans 2 mois', () => expect(after(61 * 24 * 3600)).toBe('dans 2 mois'));
  it('il y a 5 minutes', () => expect(after(-5 * 60)).toBe('il y a 5 minutes'));
  it('dans 3 heures', () => expect(after(3 * 3600)).toBe('dans 3 heures'));
  it('il y a 10 jours', () => expect(after(-10 * 24 * 3600)).toBe('il y a 10 jours'));
  it('dans 2 ans', () => expect(after(2 * 365 * 24 * 3600)).toBe('dans 2 ans'));
});

describe('Le fuseau horaire du lecteur est utilisé', () => {
  it('à Montréal, le même horodatage est la veille au soir', () => {
    expect(timestampPreview(NEW_YEAR_2025, 'F', { timeZone: 'America/Montreal' })).toBe('mardi 31 décembre 2024 19:00');
  });
});
