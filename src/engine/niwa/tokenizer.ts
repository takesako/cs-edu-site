import { KEYWORDS, PARTICLES, type Token, type TokenKind } from './token';
import { err, type Result } from './errors';

export type TokenizeResult = Result<{ tokens: Token[] }>;

const OPS = new Set(['+', '-', '*', '/', '×', '÷']);

function isDigit(ch: string): boolean {
  return /[0-9０-９]/.test(ch);
}

function isWordChar(ch: string): boolean {
  return /[\p{L}\p{N}_ー々]/u.test(ch);
}

function toHalfWidth(s: string): string {
  return s.replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/** にわ語は分かち書き：空白で語を区切る。「」で文字列、※で行コメント。 */
export function tokenize(source: string): TokenizeResult {
  const tokens: Token[] = [];
  let i = 0;

  const push = (kind: TokenKind, text: string, start: number, value?: number) => {
    tokens.push({ kind, text, span: { start, end: i }, ...(value !== undefined ? { value } : {}) });
  };

  while (i < source.length) {
    const ch = source[i]!;

    // 空白（改行以外）
    if (ch === ' ' || ch === '\t' || ch === '　') {
      i++;
      continue;
    }

    // 文の区切り
    if (ch === '\n' || ch === '。') {
      const start = i;
      i++;
      // 連続する区切りはひとつにまとめる
      if (tokens.at(-1)?.kind !== 'newline') push('newline', ch, start);
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }

    // コメント
    if (ch === '※' || ch === '#') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    // 文字列
    if (ch === '「') {
      const start = i;
      i++;
      let text = '';
      while (i < source.length && source[i] !== '」') {
        text += source[i];
        i++;
      }
      if (i >= source.length) {
        return err(
          'かぎかっこ「 が、」 で閉じられていません。',
          { start, end: source.length },
          '文字列の終わりには 」 を書きます。例：「こんにちは」',
        );
      }
      i++; // 」
      push('string', text, start);
      continue;
    }

    // 数
    if (isDigit(ch)) {
      const start = i;
      let raw = '';
      while (i < source.length && (isDigit(source[i]!) || source[i] === '.' || source[i] === '．')) {
        raw += source[i];
        i++;
      }
      const value = Number(toHalfWidth(raw));
      if (Number.isNaN(value)) {
        return err(`「${raw}」を数として読めませんでした。`, { start, end: i });
      }
      push('number', raw, start, value);
      continue;
    }

    // 記号
    if (ch === '{' || ch === '｛') {
      const start = i;
      i++;
      push('lbrace', '{', start);
      continue;
    }
    if (ch === '}' || ch === '｝') {
      const start = i;
      i++;
      push('rbrace', '}', start);
      continue;
    }
    if (ch === '(' || ch === '（') {
      const start = i;
      i++;
      push('lparen', '(', start);
      continue;
    }
    if (ch === ')' || ch === '）') {
      const start = i;
      i++;
      push('rparen', ')', start);
      continue;
    }
    if (OPS.has(ch)) {
      const start = i;
      i++;
      push('op', ch, start);
      continue;
    }

    // 語（ひらがな・カタカナ・漢字・英数）
    if (isWordChar(ch)) {
      const start = i;
      let text = '';
      while (i < source.length && isWordChar(source[i]!)) {
        text += source[i];
        i++;
      }
      if (KEYWORDS.has(text)) push('keyword', text, start);
      else if (PARTICLES.has(text)) push('particle', text, start);
      else push('word', text, start);
      continue;
    }

    return err(
      `「${ch}」という記号は、にわ語にはありません。`,
      { start: i, end: i + 1 },
      '使える記号は + - × ÷ ( ) { } 「」 ※ です。',
    );
  }

  tokens.push({ kind: 'eof', text: '', span: { start: i, end: i } });
  return { ok: true, tokens };
}
