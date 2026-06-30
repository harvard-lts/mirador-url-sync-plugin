import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  optimizeDeps: {
    rolldownOptions: {
      moduleTypes: {
        '.js': 'jsx',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.{test,spec}.{js,jsx}'],
  },
});
