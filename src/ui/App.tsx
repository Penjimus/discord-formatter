// Application : les deux panneaux, vues du même document (CLAUDE.md, « Principe central »).
// Gauche → document → texte de droite ; droite → document → gauche. Aucune conversion directe.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createDocument, type DiscordDocument, type MentionKind } from '../core/document';
import { unfilledTemplates } from '../core/elements';
import { checkLength, type MessageLimit } from '../core/length';
import { parse } from '../core/parse';
import { serialize } from '../core/serialize';
import { split } from '../core/split';
import { editorToDocument, type EditorNode } from './editorConvert';
import { loadEmojiIndex, loadedEmojiIndex, mayContainEmojiCode, onEmojiIndexLoaded } from './emojiLibrary';
import { CharacterCounter } from './CharacterCounter';
import { DiscordPreview } from './DiscordPreview';
import { DiscordTextPanel, type DiscordTextHandle } from './DiscordTextPanel';
import { SplitMessages } from './SplitMessages';
import { TemplateWarning } from './TemplateWarning';
import { VisualPanel, type VisualHandle } from './VisualPanel';
import { loadDraft, saveDraft } from './draftStorage';
import type { Draft } from '../core/draft';

function sameDocument(a: DiscordDocument, b: DiscordDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Délai entre la dernière modification et l'enregistrement du brouillon (S27). */
const DRAFT_SAVE_DELAY_MS = 500;

export function App() {
  // Brouillon relu une seule fois, à l'ouverture (S27, S29) ; vide s'il n'y en a pas (S30).
  const [initialDraft] = useState(loadDraft);
  // Le document : la source de vérité unique, relu depuis le texte du brouillon.
  const [initialDocument] = useState(() => (initialDraft.text ? parse(initialDraft.text) : createDocument()));
  const documentRef = useRef<DiscordDocument>(initialDocument);
  const visualRef = useRef<VisualHandle | null>(null);
  const textRef = useRef<DiscordTextHandle | null>(null);
  const [templates, setTemplates] = useState<MentionKind[]>(() => unfilledTemplates(initialDraft.text));
  // Texte de droite (pour le compteur) et limite choisie, repris du brouillon.
  const [discordText, setDiscordText] = useState(initialDraft.text);
  const [limit, setLimit] = useState<MessageLimit>(initialDraft.limit);
  const [draftSaved, setDraftSaved] = useState(false);
  // Aperçu façon Discord sous les panneaux (S31) ; affiché à chaque ouverture, non mémorisé.
  const [previewShown, setPreviewShown] = useState(true);

  // Les émojis chargés : les codes `:nom:` déjà affichés à gauche sont redessinés en émoji.
  useEffect(() => onEmojiIndexLoaded(() => visualRef.current?.showDocument(documentRef.current)), []);
  // Un brouillon qui contient un code `:nom:` : les émojis sont chargés pour l'afficher à gauche.
  useEffect(() => {
    if (!loadedEmojiIndex() && mayContainEmojiCode(initialDraft.text)) void loadEmojiIndex();
  }, [initialDraft]);

  // Brouillon enregistré peu après chaque modification, et tout de suite à la fermeture de la page.
  const latestDraftRef = useRef<Draft>(initialDraft);
  latestDraftRef.current = { text: discordText, limit };
  useEffect(() => {
    const timer = window.setTimeout(() => setDraftSaved(saveDraft({ text: discordText, limit })), DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [discordText, limit]);
  useEffect(() => {
    const saveNow = () => { saveDraft(latestDraftRef.current); };
    window.addEventListener('pagehide', saveNow);
    return () => window.removeEventListener('pagehide', saveNow);
  }, []);

  // Le texte de droite a changé (d'un côté ou de l'autre) : mise à jour de l'avertissement.
  const textChanged = useCallback((text: string) => {
    setDiscordText(text);
    const kinds = unfilledTemplates(text);
    setTemplates((old) => (old.join() === kinds.join() ? old : kinds));
  }, []);

  // L'utilisateur écrit à gauche : le document change, le texte de droite est réécrit.
  const onVisualChange = useCallback((content: EditorNode) => {
    try {
      const message = editorToDocument(content);
      documentRef.current = message;
      const text = serialize(message);
      textRef.current?.setText(text);
      textChanged(text);
    } catch (error) {
      console.error('Modification de gauche non traduite :', error);
    }
  }, [textChanged]);

  // L'utilisateur écrit à droite : le texte est relu, la gauche redessinée (le texte de droite n'est pas touché).
  const onTextChange = useCallback((text: string) => {
    textChanged(text);
    // Un code `:nom:` collé : les émojis sont chargés pour l'afficher à gauche.
    if (!loadedEmojiIndex() && mayContainEmojiCode(text)) void loadEmojiIndex();
    const message = parse(text);
    if (sameDocument(message, documentRef.current)) return;
    documentRef.current = message;
    visualRef.current?.showDocument(message);
  }, [textChanged]);

  // La gauche n'est pas redessinée à chaque frappe pour le compteur : l'élément est gardé tel quel.
  const visualPanel = useMemo(
    () => <VisualPanel initialDocument={documentRef.current} onUserChange={onVisualChange} handleRef={visualRef} />,
    [onVisualChange],
  );

  // Messages découpés, seulement quand le texte de droite dépasse la limite (S25). Le découpage
  // porte sur le document, tenu à jour avant chaque changement du texte de droite.
  const messages = useMemo(
    () => (checkLength(discordText, limit).over ? split(documentRef.current, limit) : null),
    [discordText, limit],
  );

  // Un seul message déroulé à la fois : le message complet (`null`) ou un message découpé.
  // Le message complet revient dès qu'il n'y a plus de découpage ou que le message choisi n'existe plus.
  const [openedSplit, setOpenedSplit] = useState<number | null>(null);
  const splitting = messages !== null;
  useEffect(() => { if (!splitting) setOpenedSplit(null); }, [splitting]);
  const expandedSplit = messages &&openedSplit !== null && openedSplit < messages.length ? openedSplit : null;
  // Clic sur un message découpé : il se déroule ; un second clic revient au message complet.
  const toggleSplit = useCallback((index: number) => setOpenedSplit((old) => (old === index ? null : index)), []);

  // Aperçu : le document, ou chaque message découpé relu (S34). Simple affichage (S32).
  // Le document est tenu à jour avant chaque changement du texte de droite.
  const previewMessages = useMemo(
    () => (messages ? messages.map(parse) : [documentRef.current]),
    [messages, discordText],
  );

  return (
    <div className={`app${previewShown ? '' : ' preview-hidden'}`}>
      <header className="app-header">
        <h1>Discord Formatter</h1>
        <p>
          Écrivez à gauche ou collez un message à droite : les deux côtés restent synchronisés.{' '}
          <a href="guide.html" target="_blank" rel="noreferrer">Guide d'utilisation</a>
        </p>
      </header>
      <main className="panels">
        {visualPanel}
        <div className="right-column">
          <DiscordTextPanel initialText={initialDraft.text} onUserChange={onTextChange} handleRef={textRef}
            collapsed={expandedSplit !== null}
            onHeaderClick={messages ? () => setOpenedSplit(null) : undefined}
            notice={<>
              <CharacterCounter text={discordText} limit={limit} onLimitChange={setLimit} draftSaved={draftSaved} />
              <TemplateWarning kinds={templates} />
            </>} />
          {messages && <SplitMessages messages={messages} limit={limit}
            expanded={expandedSplit} onHeaderClick={toggleSplit} />}
        </div>
      </main>
      <DiscordPreview messages={previewMessages} shown={previewShown}
        onToggle={() => setPreviewShown((shown) => !shown)} />
    </div>
  );
}
