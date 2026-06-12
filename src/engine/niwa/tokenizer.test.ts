import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';
import type { Token } from './token';

function kinds(tokens: Token[]): string[] {
  return tokens.map((t) => t.kind);
}

function texts(tokens: Token[]): string[] {
  return tokens.filter((t) => t.kind !== 'eof').map((t) => t.text);
}

describe('tokenize', () => {
  it('基本の文をトークンに分ける', () => {
    const r = tokenize('まる を かく');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(texts(r.tokens)).toEqual(['まる', 'を', 'かく']);
    expect(kinds(r.tokens)).toEqual(['word', 'particle', 'keyword', 'eof']);
  });

  it('数を読む（半角・全角・小数）', () => {
    const r = tokenize('90 １２ 3.5');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const nums = r.tokens.filter((t) => t.kind === 'number');
    expect(nums.map((t) => t.value)).toEqual([90, 12, 3.5]);
  });

  it('かぎかっこの文字列を読む', () => {
    const r = tokenize('「こんにちは、庭」 と いう');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tokens[0]).toMatchObject({ kind: 'string', text: 'こんにちは、庭' });
  });

  it('閉じていない文字列はエラー', () => {
    const r = tokenize('「とじてない');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain('」');
  });

  it('改行と。は文の区切り', () => {
    const r = tokenize('まる を かく\n50 すすむ。みぎ へ 90 まわる');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(kinds(r.tokens).filter((k) => k === 'newline')).toHaveLength(2);
  });

  it('※コメントは行末まで無視する', () => {
    const r = tokenize('まる を かく ※これは円を描く\n50 すすむ');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(texts(r.tokens)).not.toContain('これは円を描く');
    expect(texts(r.tokens)).toContain('すすむ');
  });

  it('波かっこと演算子を読む', () => {
    const r = tokenize('3 かい くりかえす { 2 + 3 × 4 }');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const k = kinds(r.tokens);
    expect(k).toContain('lbrace');
    expect(k).toContain('rbrace');
    expect(r.tokens.filter((t) => t.kind === 'op').map((t) => t.text)).toEqual(['+', '×']);
  });

  it('各トークンがSpanを持つ', () => {
    const r = tokenize('まる を かく');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tokens[0]!.span).toEqual({ start: 0, end: 2 });
    expect(r.tokens[1]!.span).toEqual({ start: 3, end: 4 });
  });

  it('知らない記号は位置つきエラー', () => {
    const r = tokenize('まる を かく @');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.span.start).toBe(8);
    expect(r.error.message).toContain('@');
  });

  it('助詞の「と」と動詞の「とよぶ」を区別する', () => {
    const r = tokenize('90 を かくど とよぶ');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(kinds(r.tokens)).toEqual(['number', 'particle', 'word', 'keyword', 'eof']);
  });
});
