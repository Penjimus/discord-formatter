// Étape 9 : blocs de code écrits à gauche, couleurs ANSI, document d'analyse de la barre d'outils.
import { describe, expect, it } from 'vitest';
import { ESC } from '../../src/core/characters';
import { toolbarState } from '../../src/core/compatibility';
import { parse } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';
import { documentToEditor, editorToAnalysisDocument, editorToDocument, type EditorMark, type EditorNode } from '../../src/ui/editorConvert';
import { attrToColor, colorToAttr } from '../../src/ui/ansiPalette';

const line = (attrs: Record<string, unknown>, ...content: EditorNode[]): EditorNode => ({
  type: 'line',
  attrs: { quote: false, listKind: null, listLevel: 0, listStart: null, lineStyle: 'normal', ...attrs },
  content: content.length > 0 ? content : undefined,
});
const t = (value: string, ...marks: (string | EditorMark)[]): EditorNode => ({
  type: 'text',
  text: value,
  marks: marks.map((mark) => (typeof mark === 'string' ? { type: mark } : mark)),
});
const block = (attrs: Record<string, unknown>, ...content: EditorNode[]): EditorNode => ({
  type: 'codeBlock',
  attrs: { language: '', quote: false, inBullet: false, marks: [], ...attrs },
  content: content.length > 0 ? content : undefined,
});
const doc = (...content: EditorNode[]): EditorNode => ({ type: 'doc', content });
const color = (value: string): EditorMark => ({ type: 'ansiColor', attrs: { color: value } });
const background = (value: string): EditorMark => ({ type: 'ansiBackground', attrs: { color: value } });
const bullet = { listKind: 'bullet', listLevel: 1 };
const write = (root: EditorNode) => serialize(editorToDocument(root));

describe('Bloc de code écrit à gauche (S3)', () => {
  it('bloc avec langage', () => {
    expect(write(doc(block({ language: 'js' }, t('const a = 1;'))))).toBe('```js\nconst a = 1;\n```');
  });

  it('bloc vide : rien n\'est écrit', () => {
    expect(write(doc(line({}, t('a')), block({})))).toBe('a');
  });

  it('langage tapé avec des espaces : espaces retirés', () => {
    expect(write(doc(block({ language: ' py ' }, t('x'))))).toBe('```py\nx\n```');
  });

  it('lignes vides du début et de la fin retirées (F4)', () => {
    expect(write(doc(block({}, t('\n\nx\n\n'))))).toBe('```\nx\n```');
  });

  it('ligne vide au milieu d\'un bloc normal : gardée', () => {
    expect(write(doc(block({}, t('a\n\nb'))))).toBe('```\na\n\nb\n```');
  });
});

describe('Couleurs ANSI écrites à gauche (S4)', () => {
  it('un mot coloré dans un bloc sans langage : bloc ansi, couleur refermée', () => {
    const root = doc(block({}, t('un '), t('mot', color('31')), t(' coloré')));
    expect(write(root)).toBe(`\`\`\`ansi\nun ${ESC}[31mmot${ESC}[0m coloré\n\`\`\``);
  });

  it('styles, fond et texte dans l\'ordre de l\'appli (§6)', () => {
    const root = doc(block({ language: 'ansi' }, t('x', 'ansiBold', 'ansiUnderline', background('45'), color('37'))));
    expect(write(root)).toBe(`\`\`\`ansi\n${ESC}[1;4;45;37mx${ESC}[0m\n\`\`\``);
  });

  it('couleur et fond au choix (X3, E14a)', () => {
    const root = doc(block({}, t('x', background('#782ca0'), color('#ffda06'))));
    expect(write(root)).toBe(`\`\`\`ansi\n${ESC}[48;2;120;44;160;38;2;255;218;6mx${ESC}[0m\n\`\`\``);
  });

  it('italique et barré ANSI (E7, E15)', () => {
    expect(write(doc(block({}, t('x', 'ansiItalic', 'ansiStrike'))))).toBe(`\`\`\`ansi\n${ESC}[3;9mx${ESC}[0m\n\`\`\``);
  });

  it('bloc avec un langage : les couleurs ne sont pas écrites (§5)', () => {
    expect(write(doc(block({ language: 'js' }, t('x', color('31')))))).toBe('```js\nx\n```');
  });

  it('bloc ansi collé à droite : couleurs reçues à gauche (S11) et réécrites à l\'identique', () => {
    const message = `\`\`\`ansi\n${ESC}[1;31mrouge${ESC}[0m et ${ESC}[48;2;1;2;3mfond${ESC}[0m\n\`\`\``;
    const editor = documentToEditor(parse(message));
    const marks = editor.content![0].content!.map((node) => node.marks?.map((mark) => mark.type) ?? []);
    expect(marks).toEqual([['ansiBold', 'ansiColor'], [], ['ansiBackground']]);
    expect(serialize(editorToDocument(editor))).toBe(message);
  });

  it('E16 : couleur claire et 256 couleurs écrites à gauche', () => {
    const root = doc(block({}, t('x', background('n21'), color('91'))));
    expect(write(root)).toBe(`\`\`\`ansi\n${ESC}[48;5;21;91mx${ESC}[0m\n\`\`\``);
    expect(colorToAttr({ index: 196 })).toBe('n196');
    expect(attrToColor('n196')).toEqual({ index: 196 });
  });

  it('valeur de couleur : code ou couleur au choix', () => {
    expect(colorToAttr(31)).toBe('31');
    expect(colorToAttr({ r: 255, g: 218, b: 6 })).toBe('#ffda06');
    expect(attrToColor('#ffda06')).toEqual({ r: 255, g: 218, b: 6 });
    expect(attrToColor('45')).toBe(45);
  });
});

describe('Bloc sous une puce et bloc cité : pas de ligne vide (choix 3A, G11)', () => {
  it('ligne vide dans un bloc sous une puce : retirée', () => {
    const root = doc(line(bullet, t('puce')), block({ inBullet: true }, t('a\n\nb')), line(bullet, t('suite')));
    expect(write(root)).toBe('- puce\n  ```\n  a\n  b\n  ```\n- suite');
  });

  it('ligne vide dans un bloc cité : retirée', () => {
    expect(write(doc(block({ quote: true }, t('a\n\n\nb'))))).toBe('> ```\n> a\n> b\n> ```');
  });

  it('ligne vide entre deux passages colorés d\'un bloc sous une puce : retirée', () => {
    const root = doc(line(bullet, t('puce')), block({ inBullet: true }, t('a\n', color('31')), t('\nb', color('32'))));
    expect(write(root)).toBe(`- puce\n  \`\`\`ansi\n  ${ESC}[31ma${ESC}[0m\n  ${ESC}[32mb${ESC}[0m\n  \`\`\``);
  });

  it('bloc sous une puce dont la puce a été supprimée : bloc hors de la liste', () => {
    expect(write(doc(line({}, t('texte')), block({ inBullet: true }, t('code'))))).toBe('texte\n```\ncode\n```');
  });
});

describe('Document d\'analyse : un bloc par nœud de l\'éditeur (barre d\'outils)', () => {
  it('bloc vide et puce vide gardés à leur place', () => {
    const root = doc(line(bullet, t('a')), line(bullet), block({}), line({}));
    const blocks = editorToAnalysisDocument(root).blocks;
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'paragraph', 'codeBlock', 'paragraph']);
    expect(blocks[1]).toMatchObject({ list: { kind: 'bullet', level: 1 } });
  });

  it('S6 : dans un bloc js, couleurs et styles grisés, langage actif', () => {
    const state = toolbarState(editorToAnalysisDocument(doc(block({ language: 'js' }))), { block: 0 });
    expect(state.ansiColor.enabled).toBe(false);
    expect(state.bold.enabled).toBe(false);
    expect(state.codeLanguage.enabled).toBe(true);
  });

  it('S7 : dans un bloc ansi coloré, seules les options ANSI (et citation, émoji) restent actives', () => {
    const state = toolbarState(editorToAnalysisDocument(doc(block({ language: 'ansi' }, t('x', color('31'))))), { block: 0 });
    const enabled = Object.entries(state).filter(([, option]) => option.enabled).map(([name]) => name);
    expect(enabled.sort()).toEqual(
      ['ansiBackground', 'ansiBold', 'ansiColor', 'ansiItalic', 'ansiStrike', 'ansiUnderline', 'blankLine', 'emoji', 'quote'].sort(),
    );
  });

  it('bloc de code sous un élément numéroté : grisé (§3)', () => {
    const root = doc(line({ listKind: 'ordered', listLevel: 1 }, t('a')));
    expect(toolbarState(editorToAnalysisDocument(root), { block: 0 }).codeBlock.enabled).toBe(false);
  });
});
