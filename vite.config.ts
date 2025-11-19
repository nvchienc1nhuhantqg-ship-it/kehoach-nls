import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. Lấy các biến môi trường từ file .env (khi chạy ở máy local)
  const env = loadEnv(mode, process.cwd(), '');

  // 2. QUAN TRỌNG: Lấy chìa khóa từ GitHub Actions (process.env) HOẶC từ file .env
  // Dòng này đảm bảo dù chạy ở đâu cũng bắt được chìa khóa
  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;

  return {
    // Đường dẫn gốc cho GitHub Pages
    base: '/kehoach-nls/', 
    
    plugins: [react()],
    
    // Nạp chìa khóa vào trong code React
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
      'process.env.API_KEY': JSON.stringify(apiKey) // Dự phòng nếu code dùng tên này
    }
  };
});
