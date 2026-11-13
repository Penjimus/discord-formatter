// Test factice de l'étape 0 : vérifie que l'outil de tests tourne.
import { describe, expect, it } from 'vitest';
import { ESC, ZERO_WIDTH_SPACE } from '../../src/core/characters';

describe('Étape 0 : squelette', () => {
  it('les constantes invisibles valent bien un caractère chacune', () => {
    expect(ESC).toBe('\u001b');
    expect(ESC.length).toBe(1);
    expect(ZERO_WIDTH_SPACE).toBe('\u200b');
    expect(ZERO_WIDTH_SPACE.length).toBe(1);
  });
});
