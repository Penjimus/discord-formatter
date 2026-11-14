// Étape 18 : textes de l'interface en français et en anglais (S36 à S39).
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/core/parse';
import { REASON_CODES } from '../../src/core/reasons';
import { serialize } from '../../src/core/serialize';
import { toolbarState, TOOLBAR_OPTIONS } from '../../src/core/compatibility';
import { codeBlock, createDocument, bulletItem, numberedItem, paragraph, quoted, text } from '../../src/core/document';
import { documentToEditor, editorToDocument } from '../../src/ui/editorConvert';
import { browserLanguage, currentLanguage, reasonText, setLanguage, TEXTS } from '../../src/ui/i18n/language';
import { matchingChoices } from '../../src/ui/mentionSuggest';

type Entry = { path: string; kind: string; value: unknown };

/** Toutes les entrées d'une liste de textes : chemin et sorte (texte, fonction, liste de N textes). */
function entries(value: unknown, path = ''): Entry[] {
  if (typeof value === 'function') return [{ path, kind: 'function', value }];
  if (typeof value === 'string') return [{ path, kind: 'string', value }];
  if (Array.isArray(value)) return [{ path, kind: `list of ${value.length}`, value }];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => entries(child, path ? `${path}.${key}` : key));
}

describe('Aucun texte ne manque dans l\'une des deux langues', () => {
  const fr = entries(TEXTS.fr);
  const en = entries(TEXTS.en);

  it('mêmes entrées, de même sorte, dans les deux langues', () => {
    expect(en.map(({ path, kind }) => `${path} (${kind})`)).toEqual(fr.map(({ path, kind }) => `${path} (${kind})`));
  });

  it('aucun texte vide', () => {
    for (const { path, kind, value } of [...fr, ...en]) {
      if (kind === 'string') expect(value, path).not.toBe('');
      if (kind.startsWith('list')) for (const item of value as string[]) expect(item, path).not.toBe('');
    }
  });

  it('chaque raison du cœur a son texte dans les deux langues', () => {
    for (const code of REASON_CODES) {
      for (const language of ['fr', 'en'] as const) {
        expect(TEXTS[language].reasons[code], `${language}.${code}`).toBeTypeOf('function');
        expect(TEXTS[language].reasons[code]({}), `${language}.${code}`).not.toBe('');
      }
    }
  });

  it('chaque option grisée a une raison nommée, traduite', () => {
    const contexts = [
      createDocument(paragraph(text('a'))),
      createDocument(bulletItem(1, text('a'))),
      createDocument(numberedItem(1, 1, text('a'))),
      createDocument(quoted(paragraph(text('a')))),
      createDocument(codeBlock('x', { language: 'js' })),
      createDocument(codeBlock('x')),
    ];
    for (const message of contexts) {
      const state = toolbarState(message, { block: 0 });
      for (const option of TOOLBAR_OPTIONS) {
        if (state[option].enabled) continue;
        expect(state[option].code, option).not.toBeNull();
        expect(reasonText(TEXTS.en, state[option]), option).not.toBe(TEXTS.en.reasonUnknown);
      }
    }
  });

  it('le français reste le texte du cœur (aucun changement pour l\'utilisateur francophone)', () => {
    const state = toolbarState(createDocument(paragraph(text('a'))), { block: 0 });
    expect(reasonText(TEXTS.fr, state.codeLanguage)).toBe(state.codeLanguage.reason);
    expect(reasonText(TEXTS.en, state.codeLanguage)).toBe('The language is chosen inside a code block.');
  });
});

describe('Langue au premier lancement (S37)', () => {
  it('français si le navigateur est en français, anglais sinon', () => {
    expect(browserLanguage(['fr-FR', 'en'])).toBe('fr');
    expect(browserLanguage(['fr'])).toBe('fr');
    expect(browserLanguage(['fr-CA'])).toBe('fr');
    expect(browserLanguage(['en-US', 'fr'])).toBe('en');
    expect(browserLanguage(['de-DE'])).toBe('en');
    expect(browserLanguage([])).toBe('en');
  });
});

describe('Propositions @ # dans les deux langues', () => {
  it('« ro » trouve Rôle/Role, « sal » et « chan » trouvent le salon, « us » et « util » l\'utilisateur', () => {
    expect(matchingChoices('@', 'ro').map((choice) => choice.kind)).toEqual(['role']);
    expect(matchingChoices('#', 'sal').map((choice) => choice.kind)).toEqual(['channel']);
    expect(matchingChoices('#', 'chan').map((choice) => choice.kind)).toEqual(['channel']);
    expect(matchingChoices('@', 'us').map((choice) => choice.kind)).toEqual(['user']);
    expect(matchingChoices('@', 'util').map((choice) => choice.kind)).toEqual(['user']);
  });
});

describe('Le texte de droite ne dépend pas de la langue (S38)', () => {
  const files = import.meta.glob<string>('../../examples/*.txt', { query: '?raw', import: 'default', eager: true });
  const messages = Object.values(files).map((content) => content.replace(/\r\n/g, '\n'));
  it('les exemples sont bien chargés', () => expect(messages.length).toBeGreaterThan(5));
  messages.push('<@ID_USER> <@ID_UTILISATEUR> <#ID_SALON> <t:1735689600:R> **gras** :star:');

  it('chaque exemple, passé par l\'éditeur de gauche, donne le même texte en français et en anglais', () => {
    const before = currentLanguage();
    const written = (language: 'fr' | 'en') => {
      setLanguage(language);
      return messages.map((message) => serialize(editorToDocument(documentToEditor(parse(message)))));
    };
    const french = written('fr');
    const english = written('en');
    setLanguage(before);
    expect(english).toEqual(french);
  });
});
