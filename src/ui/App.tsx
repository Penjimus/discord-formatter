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
import { DiscordTextPanel, type DiscordTextHandle } from './DiscordTextPanel';
import { SplitMessages } from './SplitMessages';
import { TemplateWarning } from './TemplateWarning';
import { VisualPanel, type VisualHandle } from './VisualPanel';

function sameDocument(a: DiscordDocument, b: DiscordDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function App() {
  // Le document : la source de vérité unique.
  const documentRef = useRef<DiscordDocument>(createDocument());
  const visualRef = useRef<VisualHandle | null>(null);
  const textRef = useRef<DiscordTextHandle | null>(null);
  const [templates, setTemplates] = useState<MentionKind[]>([]);
  // Texte de droite (pour le compteur) et limite choisie ; 2000 au démarrage.
  const [discordText, setDiscordText] = useState('');
  const [limit, setLimit] = useState<MessageLimit>(2000);

  // Les émojis chargés : les codes `:nom:` déjà affichés à gauche sont redessinés en émoji.
  useEffect(() => onEmojiIndexLoaded(() => visualRef.current?.showDocument(documentRef.current)), []);

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

  return (
    <div className="app">
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
          <DiscordTextPanel initialText="" onUserChange={onTextChange} handleRef={textRef}
            notice={<>
              <CharacterCounter text={discordText} limit={limit} onLimitChange={setLimit} />
              <TemplateWarning kinds={templates} />
            </>} />
          {messages && <SplitMessages messages={messages} limit={limit} />}
        </div>
      </main>
    </div>
  );
}
