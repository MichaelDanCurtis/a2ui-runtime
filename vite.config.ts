import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // The IIFE runs inside a VS Code webview (a browser context) where Node's
  // `process` global does not exist. React's bundled code references
  // `process.env.NODE_ENV`, so statically replace it (and a minimal process.env
  // shim) to avoid an `Uncaught ReferenceError: process is not defined` at load.
  // Apply ONLY to `vite build` — applying it under Vitest (command: 'serve')
  // clobbers the test environment's real process.env and breaks the suite.
  ...(command === 'build'
    ? {
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env': '{}',
      },
    }
    : {}),
  build: {
    lib: { entry: 'src/host.tsx', name: 'A2uiRuntime', fileName: 'runtime', formats: ['iife'] },
    rollupOptions: { output: { inlineDynamicImports: true } },
    emptyOutDir: false,
  },
  test: { environment: 'jsdom', globals: true },
}));
