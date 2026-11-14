import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';
import { currentLanguage } from './ui/i18n/language';

// Langue de la page (lecteurs d'écran, vérification d'orthographe) : celle de l'interface (S37).
document.documentElement.lang = currentLanguage();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Élément #root introuvable dans index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
