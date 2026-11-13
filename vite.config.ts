/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Le cœur du formatage ne dépend pas du navigateur : tests en environnement Node.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
