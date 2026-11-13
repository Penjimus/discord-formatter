// Application : les deux panneaux, vues du même document (CLAUDE.md, « Principe central »).
// Gauche → document → texte de droite ; droite → document → gauche. Aucune conversion directe.
import { useCallback, useRef } from 'react';
import { createDocument, type DiscordDocument } from '../core/document';
import { parse } from '../core/parse';
import { serialize } from '../core/serialize';
import { editorToDocument, type EditorNode } from './editorConvert';
import { DiscordTextPanel, type DiscordTextHandle } from './DiscordTextPanel';
import { VisualPanel, type VisualHandle } from './VisualPanel';

function sameDocument(a: DiscordDocument, b: DiscordDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function App() {
  // Le document : la source de vérité unique.
  const documentRef = useRef<DiscordDocument>(createDocument());
  const visualRef = useRef<VisualHandle | null>(null);
  const textRef = useRef<DiscordTextHandle | null>(null);

  // L'utilisateur écrit à gauche : le document change, le texte de droite est réécrit.
  const onVisualChange = useCallback((content: EditorNode) => {
    try {
      const message = editorToDocument(content);
      documentRef.current = message;
      textRef.current?.setText(serialize(message));
    } catch (error) {
      console.error('Modification de gauche non traduite :', error);
    }
  }, []);

  // L'utilisateur écrit à droite : le texte est relu, la gauche redessinée (le texte de droite n'est pas touché).
  const onTextChange = useCallback((text: string) => {
    const message = parse(text);
    if (sameDocument(message, documentRef.current)) return;
    documentRef.current = message;
    visualRef.current?.showDocument(message);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Discord Formatter</h1>
        <p>Écrivez à gauche ou collez un message à droite : les deux côtés restent synchronisés.</p>
      </header>
      <main className="panels">
        <VisualPanel initialDocument={documentRef.current} onUserChange={onVisualChange} handleRef={visualRef} />
        <DiscordTextPanel initialText="" onUserChange={onTextChange} handleRef={textRef} />
      </main>
    </div>
  );
}
