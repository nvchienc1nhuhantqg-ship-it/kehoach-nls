import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Lấy chìa khóa từ két sắt (tên là GEMINI_API_KEY)
  const realKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  return {
    base: '/kehoach-nls/',
    plugins: [react()],
    define: {
      // --- ĐÂY LÀ CHỖ QUAN TRỌNG NHẤT ---
      // Code của thầy đòi 'process.env.API_KEY', ta gán chìa khóa vào đúng tên đó
      'process.env.API_KEY': JSON.stringify(realKey),
      
      // Gán thêm vào tên này để dự phòng
      'process.env.GEMINI_API_KEY': JSON.stringify(realKey) 
    }
  };
});
