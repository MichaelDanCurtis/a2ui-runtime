import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: { entry: 'src/host.tsx', name: 'A2uiRuntime', fileName: 'runtime', formats: ['iife'] },
    rollupOptions: { output: { inlineDynamicImports: true } },
    emptyOutDir: false,
  },
  test: { environment: 'jsdom', globals: true },
});
