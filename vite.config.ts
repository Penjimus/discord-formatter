/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Deux pages : l'appli et le guide d'utilisation.
  build: {
    rollupOptions: {
      input: { main: 'index.html', guide: 'guide.html' },
    },
  },
  test: {
    // Le cœur du formatage ne dépend pas du navigateur : tests en environnement Node.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
