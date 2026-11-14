// Étape 11 : part remplie de la barre de progression (S9, S9b, S9c).
import { describe, expect, it } from 'vitest';
import { checkLength, progressRatio } from '../../src/core/length';

describe('Barre de progression', () => {
  it('texte vide : barre vide', () => {
    expect(progressRatio(checkLength('', 2000))).toBe(0);
  });

  it('S9 : la barre suit la longueur du texte', () => {
    expect(progressRatio(checkLength('a'.repeat(500), 2000))).toBe(0.25);
  });

  it('S9b : changer de limite recalcule la barre', () => {
    const text = 'a'.repeat(1000);
    expect(progressRatio(checkLength(text, 2000))).toBe(0.5);
    expect(progressRatio(checkLength(text, 4000))).toBe(0.25);
  });

  it('K1 : exactement la limite, barre pleine sans dépassement', () => {
    const check = checkLength('a'.repeat(2000), 2000);
    expect(progressRatio(check)).toBe(1);
    expect(check.over).toBe(false);
  });

  it('S9c : en dépassement, la barre reste pleine', () => {
    const check = checkLength('a'.repeat(2500), 2000);
    expect(progressRatio(check)).toBe(1);
    expect(check.over).toBe(true);
  });
});
