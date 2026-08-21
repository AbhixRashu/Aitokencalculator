import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// NOTE: apna production domain yahan set karo — canonical URLs,
// sitemap aur robots.txt isi se generate hote hain.
export default defineConfig({
  site: 'https://aitokencalculator.salarypitcher.com',
  output: 'static',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto'
  }
});