// OGP画像の生成: node scripts/make-ogp.mjs
// 紙と苔と墨——サイトのデザイントークンをそのまま1200x630に写す
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#f6f3ea"/>
  <!-- 紙の縁 -->
  <rect x="24" y="24" width="1152" height="582" fill="none" stroke="#ddd6c3" stroke-width="2"/>
  <!-- 芽のマーク -->
  <g transform="translate(96, 150) scale(5)" stroke="#34663f" stroke-width="2.2" stroke-linecap="round" fill="none">
    <path d="M16 28 V14 M16 18 C16 12 10 11 7 12 C8 17 13 19 16 18 M16 14 C16 8 22 6 25 7 C24 13 19 15 16 14"/>
  </g>
  <text x="96" y="400" font-family="Noto Serif CJK JP" font-weight="bold" font-size="110" fill="#2a2823" letter-spacing="6">言語の庭</text>
  <text x="100" y="478" font-family="Noto Serif CJK JP" font-weight="bold" font-size="40" fill="#57523f" letter-spacing="4">ことばを育てて、言語をつくる。</text>
  <text x="100" y="556" font-family="Noto Serif CJK JP" font-size="28" fill="#6b6557" letter-spacing="2">登録不要・ずっと無料の、プログラミング言語教育サイト</text>
  <!-- 朱の印 -->
  <rect x="1020" y="492" width="84" height="84" rx="10" fill="none" stroke="#b9472f" stroke-width="3"/>
  <text x="1062" y="528" font-family="Noto Serif CJK JP" font-weight="bold" font-size="30" fill="#b9472f" text-anchor="middle">無</text>
  <text x="1062" y="562" font-family="Noto Serif CJK JP" font-weight="bold" font-size="30" fill="#b9472f" text-anchor="middle">料</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(join(root, 'public/ogp.png'));
console.log('public/ogp.png generated');
