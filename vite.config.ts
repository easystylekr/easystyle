import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html')
          }
        }
      },
      publicDir: 'public',
      server: {
        host: '0.0.0.0', // 모든 네트워크 인터페이스에서 접속 가능
        port: 5173,
        https: false, // HTTP로 변경 (개발 중)
        hmr: {
          port: 5173,
          host: '0.0.0.0'
        },
        watch: {
          usePolling: false,
          interval: 1000
        }
      }
    };
});
