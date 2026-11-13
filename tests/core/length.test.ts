// Étape 7 : compteur de caractères (docs/discord-rules.md §9 et §12, série K du cahier).
import { describe, expect, it } from 'vitest';
import { ESC, ZERO_WIDTH_SPACE } from '../../src/core/characters';
import { checkLength, discordLength } from '../../src/core/length';

// Émojis écrits en échappements pour rester lisibles dans le code.
const GRINNING = '\u{1F600}'; // 😀
const FLAG_FR = '\u{1F1EB}\u{1F1F7}'; // 🇫🇷
const THUMB_MEDIUM = '\u{1F44D}\u{1F3FD}'; // 👍🏽

describe('Série K : longueur et limite', () => {
  it('K1 : 2000 « a » sont acceptés', () => {
    const result = checkLength('a'.repeat(2000), 2000);
    expect(result.length).toBe(2000);
    expect(result.remaining).toBe(0);
    expect(result.over).toBe(false);
  });

  it('K2 : 2001 « a » dépassent la limite', () => {
    const result = checkLength('a'.repeat(2001), 2000);
    expect(result.length).toBe(2001);
    expect(result.remaining).toBe(-1);
    expect(result.over).toBe(true);
  });

  it('K3 : 666 × 😀 comptent 1332, acceptés', () => {
    const result = checkLength(GRINNING.repeat(666), 2000);
    expect(result.length).toBe(1332);
    expect(result.over).toBe(false);
  });

  it('K4 : 667 × 😀 comptent 1334, acceptés', () => {
    const result = checkLength(GRINNING.repeat(667), 2000);
    expect(result.length).toBe(1334);
    expect(result.over).toBe(false);
  });

  it('K5 : 500 drapeaux 🇫🇷 comptent 2000, acceptés', () => {
    const result = checkLength(FLAG_FR.repeat(500), 2000);
    expect(result.length).toBe(2000);
    expect(result.over).toBe(false);
  });

  it('K6 : 501 drapeaux 🇫🇷 comptent 2004, dépassement', () => {
    const result = checkLength(FLAG_FR.repeat(501), 2000);
    expect(result.length).toBe(2004);
    expect(result.over).toBe(true);
  });

  it('K7 : 500 pouces teintés 👍🏽 comptent 2000, acceptés', () => {
    const result = checkLength(THUMB_MEDIUM.repeat(500), 2000);
    expect(result.length).toBe(2000);
    expect(result.over).toBe(false);
  });

  it('K8 : 501 pouces teintés 👍🏽 comptent 2004, dépassement', () => {
    const result = checkLength(THUMB_MEDIUM.repeat(501), 2000);
    expect(result.length).toBe(2004);
    expect(result.over).toBe(true);
  });

  it('K9 : 1999 « a » + <ESC> comptent 2000, acceptés', () => {
    const result = checkLength('a'.repeat(1999) + ESC, 2000);
    expect(result.length).toBe(2000);
    expect(result.over).toBe(false);
  });

  it('K10 : 2000 « a » + <ESC> comptent 2001, dépassement', () => {
    const result = checkLength('a'.repeat(2000) + ESC, 2000);
    expect(result.length).toBe(2001);
    expect(result.over).toBe(true);
  });
});

describe('Compteur : autres règles (§12)', () => {
  it('un code ANSI complet <ESC>[1;31m compte 7', () => {
    expect(discordLength(`${ESC}[1;31m`)).toBe(7);
  });

  it('U+200B compte 1', () => {
    expect(discordLength(ZERO_WIDTH_SPACE)).toBe(1);
  });

  it('les balises comptent comme du texte', () => {
    expect(discordLength('**gras**')).toBe(8);
  });

  it('limite 4000 : 2001 « a » ne dépassent plus', () => {
    const result = checkLength('a'.repeat(2001), 4000);
    expect(result.limit).toBe(4000);
    expect(result.remaining).toBe(1999);
    expect(result.over).toBe(false);
  });

  it('limite 4000 : 4001 « a » dépassent', () => {
    expect(checkLength('a'.repeat(4001), 4000).over).toBe(true);
  });

  it('S9c : le texte en dépassement n’est jamais modifié', () => {
    const text = 'a'.repeat(2500);
    const copy = text;
    const result = checkLength(text, 2000);
    expect(text).toBe(copy);
    expect(result.length).toBe(2500);
    expect(result.remaining).toBe(-500);
  });

  it('texte vide : longueur 0', () => {
    expect(checkLength('', 2000)).toEqual({ length: 0, limit: 2000, remaining: 2000, over: false });
  });
});
