// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';

// GitHub Pages: https://kmizu.github.io/cs-edu-site/
// カスタムドメイン移行時は SITE_URL / BASE_PATH を変えるだけで済むようにしておく
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://takesako.github.io',
  base: process.env.BASE_PATH ?? '/cs-edu-site',
  trailingSlash: 'always',
  prefetch: true,
  integrations: [
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
    }),
    mdx(),
    preact(),
    sitemap(),
  ],
});
