// Étape 16 : brouillon enregistré dans le navigateur (SPEC.md S27 à S30).
import { describe, expect, it } from 'vitest';
import { ESC, ZERO_WIDTH_SPACE } from '../../src/core/characters';
import { decodeDraft, EMPTY_DRAFT, encodeDraft, type Draft } from '../../src/core/draft';

describe('Brouillon : aller-retour (S27, S29)', () => {
  it('le texte et la limite reviennent à l\'identique', () => {
    const draft: Draft = { text: '**bonjour**\n- a\n- b', limit: 4000 };
    expect(decodeDraft(encodeDraft(draft))).toEqual(draft);
  });

  it('les caractères invisibles et la syntaxe inconnue sont gardés (S12)', () => {
    const text = `\`\`\`ansi\n${ESC}[1;31mrouge${ESC}[0m\n\`\`\`\n**1**${ZERO_WIDTH_SPACE}*2* <:perso:123> ||x`;
    expect(decodeDraft(encodeDraft({ text, limit: 2000 })).text).toBe(text);
  });

  it('un texte vide est un brouillon vide (S28)', () => {
    expect(decodeDraft(encodeDraft({ text: '', limit: 2000 }))).toEqual({ text: '', limit: 2000 });
  });
});

describe('Brouillon absent ou illisible : texte vide, limite 2000 (S30)', () => {
  const unreadable = [
    null,
    '',
    'pas du JSON',
    '42',
    'null',
    '[]',
    '{"text": 12, "limit": 4000}',
    '{"version": 99, "text": "a", "limit": 4000}',
  ];
  for (const stored of unreadable) {
    it(`${JSON.stringify(stored)} → brouillon vide`, () => {
      expect(decodeDraft(stored)).toEqual(EMPTY_DRAFT);
    });
  }

  it('une limite inconnue redevient 2000, le texte est gardé', () => {
    const stored = encodeDraft({ text: 'a', limit: 2000 }).replace('"limit":2000', '"limit":3000');
    expect(decodeDraft(stored)).toEqual({ text: 'a', limit: 2000 });
  });
});
