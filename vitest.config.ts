import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const workspaceRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(workspaceRoot, 'src'),
      '@shared': path.resolve(workspaceRoot, 'shared'),
    },
  },
});
