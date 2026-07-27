import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://baimeixiaofan.xyz',
  output: 'static',
  build: {
    format: 'directory'
  },
  server: {
    port: 4321,
    host: '127.0.0.1'
  }
});
