import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    // Build options
    target: 'esnext',
    outDir: 'dist',
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: [
        // Exclude node builtins and dependencies
        ...builtinModules,
        'react',
        'react-dom',
        '@linear/sdk',
        'commander',
        'conf',
        'csv-parse',
        'csv-stringify',
        'ink',
        'ink-link',
        'ink-text-input',
        'marked',
        'marked-terminal',
        'table',
        'zustand'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@store': '/src/store'
    }
  }
}); 