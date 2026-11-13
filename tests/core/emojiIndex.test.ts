// Émojis standards d'emojibase : noms `:nom:` (affichage à gauche, §9) et recherche du sélecteur (S8b).
import { describe, expect, it } from 'vitest';
import compact from 'emojibase-data/fr/compact.json';
import github from 'emojibase-data/en/shortcodes/github.json';
import messages from 'emojibase-data/fr/messages.json';
import { buildEmojiIndex, type EmojiSource } from '../../src/core/emojiIndex';

const index = buildEmojiIndex(compact as unknown as EmojiSource[], github, messages.groups);

describe('Code `:nom:` → émoji', () => {
  it(':star: → ⭐ (X2)', () => expect(index.emojiForCode(':star:')).toBe('⭐'));
  it(':+1: et :thumbsup: → 👍', () => {
    expect(index.emojiForCode(':+1:')).toBe('👍');
    expect(index.emojiForCode(':thumbsup:')).toBe('👍');
  });
  it(':100: → 💯', () => expect(index.emojiForCode(':100:')).toBe('💯'));
  it(':heart: → ❤️ (forme émoji complète)', () => expect(index.emojiForCode(':heart:')).toBe('❤️'));
  it('\\:star: donne aussi ⭐ (I4)', () => expect(index.emojiForCode('\\:star:')).toBe('⭐'));
  it('nom inconnu : aucun émoji', () => expect(index.emojiForCode(':nexistepas:')).toBeNull());
  it('pas un code : aucun émoji', () => {
    expect(index.emojiForCode('star')).toBeNull();
    expect(index.emojiForCode(':star:x')).toBeNull();
  });
});

describe('Recherche du sélecteur', () => {
  it('en français : « étoile » trouve ⭐', () => {
    expect(index.search('étoile').map((emoji) => emoji.unicode)).toContain('⭐');
  });
  it('sans accent : « etoile » trouve ⭐', () => {
    expect(index.search('etoile').map((emoji) => emoji.unicode)).toContain('⭐');
  });
  it('en anglais, avec le nom Discord : « star » et « thumbsup »', () => {
    expect(index.search('star').map((emoji) => emoji.unicode)).toContain('⭐');
    expect(index.search('thumbsup').map((emoji) => emoji.unicode)).toContain('👍');
  });
  it('le nom exact vient en premier : « etoile » → ⭐, « star » → ⭐', () => {
    expect(index.search('etoile')[0]?.unicode).toBe('⭐');
    expect(index.search('star')[0]?.unicode).toBe('⭐');
  });
  it('recherche vide : aucun résultat', () => expect(index.search('  ')).toEqual([]));
});

describe('Catégories', () => {
  it('les catégories en français, sans les « composants » (teintes seules)', () => {
    const names = index.categories.map((category) => category.name);
    expect(names[0]).toBe('smileys et émotions');
    expect(names).toContain('drapeaux');
    expect(names).not.toContain('composants');
  });
  it('chaque émoji a son nom français et ses codes', () => {
    const star = index.categories.flatMap((category) => category.emojis).find((emoji) => emoji.unicode === '⭐');
    expect(star?.label).toBe('étoile');
    expect(star?.shortcodes).toEqual(['star']);
  });
});
