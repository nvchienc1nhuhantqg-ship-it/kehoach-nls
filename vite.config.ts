import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Lấy chìa khóa từ GitHub (tên là GEMINI_API_KEY)
  const realKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  return {
    base: '/kehoach-nls/',
    plugins: [react()],
    define: {
      // QUAN TRỌNG: Gán chìa khóa vào đúng cái tên mà code của thầy đang tìm (API_KEY)
      'process.env.API_KEY': JSON.stringify(realKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(realKey) 
    }
  };
});
