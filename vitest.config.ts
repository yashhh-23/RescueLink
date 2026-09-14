import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
  },
  resolve: {
    alias: [
      { find: '@rescue-link/schema', replacement: path.resolve(__dirname, './packages/schema/src') },
      { find: '@rescue-link/config', replacement: path.resolve(__dirname, './packages/config/src') },
      {
        find: /^@\/(.*)$/,
        replacement: (match: string, p1: string) => {
          const responderPath = path.resolve(__dirname, './apps/responder-web/src', p1);
          if (
            fs.existsSync(responderPath) ||
            fs.existsSync(responderPath + '.ts') ||
            fs.existsSync(responderPath + '.tsx') ||
            fs.existsSync(responderPath + '/index.ts') ||
            fs.existsSync(responderPath + '/index.tsx')
          ) {
            return responderPath;
          }
          return path.resolve(__dirname, './apps/survivor-web/src', p1);
        },
      },
    ],
  },
});
