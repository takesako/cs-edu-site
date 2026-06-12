import { describe, it, expect } from 'vitest';
import { STAGE_ADD, STAGE_CALC, STAGE_NUMBER, STAGE_VAR } from './features';
import { runMini, tokenizeMini, parseMini } from './index';

describe('tokenizeMini', () => {
  it('数と演算子とかっこ', () => {
    const r = tokenizeMini('1 + 2 * (3 - 4) / 5');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tokens.map((t) => t.kind)).toEqual([
      'number',
      'op',
      'number',
      'op',
      'lparen',
      'number',
      'op',
      'number',
      'rparen',
      'op',
      'number',
      'eof',
    ]);
  });

  it('×÷も読める', () => {
    const r = tokenizeMini('2 × 3 ÷ 4');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tokens.filter((t) => t.kind === 'op').map((t) => t.text)).toEqual(['*', '/']);
  });

  it('知らない記号は位置つきエラー', () => {
    const r = tokenizeMini('1 @ 2');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.span.start).toBe(2);
  });
});

describe('parseMini — 段階制御', () => {
  it('STAGE_NUMBER: 数だけの言語', () => {
    expect(parseMini('42', STAGE_NUMBER).ok).toBe(true);
    const r = parseMini('1 + 2', STAGE_NUMBER);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain('まだ');
  });

  it('STAGE_ADD: +はあるが×はまだ', () => {
    expect(parseMini('1 + 2 - 3', STAGE_ADD).ok).toBe(true);
    const r = parseMini('2 * 3', STAGE_ADD);
    expect(r.ok).toBe(false);
  });

  it('STAGE_ADD: かっこもまだ', () => {
    expect(parseMini('(1 + 2)', STAGE_ADD).ok).toBe(false);
  });

  it('STAGE_CALC: 全部の計算が通る', () => {
    expect(parseMini('1 + 2 * (3 - 4) / 5', STAGE_CALC).ok).toBe(true);
  });
});

describe('runMini — 評価', () => {
  it('数はその数になる', () => {
    const r = runMini('42', STAGE_NUMBER);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([42]);
  });

  it('優先順位: ×が+より先', () => {
    const r = runMini('1 + 2 * 3', STAGE_CALC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([7]);
  });

  it('かっこが先', () => {
    const r = runMini('(1 + 2) * 3', STAGE_CALC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([9]);
  });

  it('複数行はそれぞれ評価される', () => {
    const r = runMini('1 + 1\n2 * 5', STAGE_CALC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([2, 10]);
  });

  it('0で割るとやさしいエラー', () => {
    const r = runMini('10 / 0', STAGE_CALC);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain('0');
  });

  it('変数（STAGE_VAR）: 代入と参照', () => {
    const r = runMini('x = 10\nx * 2', STAGE_VAR);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([10, 20]);
  });

  it('STAGE_CALCでは変数はまだ', () => {
    expect(runMini('x = 1', STAGE_CALC).ok).toBe(false);
  });

  it('未定義の変数は名前入りエラー', () => {
    const r = runMini('nazo + 1', STAGE_VAR);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain('nazo');
  });

  it('文の途中で終わるとエラー', () => {
    const r = runMini('1 +', STAGE_CALC);
    expect(r.ok).toBe(false);
  });

  it('単項マイナス', () => {
    const r = runMini('-5 + 8', STAGE_CALC);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([3]);
  });
});
