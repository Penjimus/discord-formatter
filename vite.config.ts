/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // Version construite (`npm run build`, vue avec `npm run preview`) : adresse du site sur GitHub Pages,
  // https://penjimus.github.io/discord-formatter/. En local (`npm run dev`) : http://localhost:5173/.
  base: command === 'build' || isPreview ? '/discord-formatter/' : '/',
  // Trois pages : l'appli et le guide d'utilisation (français, anglais).
  build: {
    rollupOptions: {
      input: { main: 'index.html', guide: 'guide.html', guideEn: 'guide-en.html' },
    },
  },
  test: {
    // Le cœur du formatage ne dépend pas du navigateur : tests en environnement Node.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
