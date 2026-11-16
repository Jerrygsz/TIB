import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 部署在子路径 /TIB/ 下，必须设置 base 否则静态资源 404
  base: '/TIB/',
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: 'es2020'
  }
});
