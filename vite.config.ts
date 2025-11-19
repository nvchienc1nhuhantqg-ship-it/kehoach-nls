import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Tìm chìa khóa ở khắp mọi nơi
  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  return {
    base: '/kehoach-nls/',
    plugins: [react()],
    define: {
      // Cung cấp chìa khóa cho mọi cách gọi tên có thể xảy ra
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
      'process.env.API_KEY': JSON.stringify(apiKey),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey)
    }
  };
});
