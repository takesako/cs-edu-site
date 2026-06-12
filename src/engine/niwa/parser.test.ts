import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type { Stmt } from './ast';

function stmts(source: string): Stmt[] {
  const r = parse(source);
  if (!r.ok) throw new Error(`parse failed: ${r.error.message}`);
  return r.program.body;
}

describe('parse — 文', () => {
  it('かく文', () => {
    const [s] = stmts('まる を かく');
    expect(s).toMatchObject({ type: 'draw', shape: { type: 'ident', name: 'まる' } });
  });

  it('いう文（と・を 両対応）', () => {
    expect(stmts('「やあ」 と いう')[0]).toMatchObject({
      type: 'say',
      value: { type: 'str', value: 'やあ' },
    });
    expect(stmts('「やあ」 を いう')[0]).toMatchObject({ type: 'say' });
  });

  it('すすむ文', () => {
    expect(stmts('50 すすむ')[0]).toMatchObject({
      type: 'move',
      distance: { type: 'num', value: 50 },
    });
  });

  it('まわる文', () => {
    expect(stmts('みぎ へ 90 まわる')[0]).toMatchObject({
      type: 'turn',
      direction: 'right',
      angle: { type: 'num', value: 90 },
    });
    expect(stmts('ひだり へ 45 まわる')[0]).toMatchObject({ type: 'turn', direction: 'left' });
  });

  it('名づけ文', () => {
    expect(stmts('90 を かくど とよぶ')[0]).toMatchObject({
      type: 'name',
      name: 'かくど',
      value: { type: 'num', value: 90 },
    });
  });

  it('付け替え文', () => {
    expect(stmts('いろ を あか にする')[0]).toMatchObject({
      type: 'assign',
      name: 'いろ',
      value: { type: 'ident', name: 'あか' },
    });
  });

  it('くりかえし文', () => {
    const [s] = stmts('6 かい くりかえす {\n まる を かく\n みぎ へ 60 まわる\n}');
    expect(s).toMatchObject({ type: 'repeat', count: { value: 6 } });
    expect((s as { body: Stmt[] }).body).toHaveLength(2);
  });

  it('もし文（ちがえば付き）', () => {
    const [s] = stmts('もし 3 が 2 より おおきい ならば { まる を かく } ちがえば { 10 すすむ }');
    expect(s).toMatchObject({
      type: 'if',
      cond: { type: 'compare', op: 'gt' },
    });
    const ifStmt = s as { then: Stmt[]; else?: Stmt[] };
    expect(ifStmt.then).toHaveLength(1);
    expect(ifStmt.else).toHaveLength(1);
  });

  it('ことばの定義と呼び出し', () => {
    const body = stmts('はなびら とは {\n まる を かく\n}\nはなびら');
    expect(body[0]).toMatchObject({ type: 'def', name: 'はなびら' });
    expect(body[1]).toMatchObject({ type: 'call', name: 'はなびら' });
  });
});

describe('parse — 式', () => {
  it('四則演算の優先順位（×が+より先）', () => {
    const [s] = stmts('2 + 3 × 4 すすむ');
    expect(s).toMatchObject({
      type: 'move',
      distance: {
        type: 'binop',
        op: '+',
        left: { value: 2 },
        right: { type: 'binop', op: '*', left: { value: 3 }, right: { value: 4 } },
      },
    });
  });

  it('かっこが優先順位を変える', () => {
    const [s] = stmts('( 2 + 3 ) × 4 すすむ');
    expect(s).toMatchObject({
      type: 'move',
      distance: { type: 'binop', op: '*', left: { type: 'binop', op: '+' } },
    });
  });

  it('おなじ比較', () => {
    const [s] = stmts('もし こたえ が 7 と おなじ ならば { まる を かく }');
    expect(s).toMatchObject({ type: 'if', cond: { type: 'compare', op: 'eq' } });
  });
});

describe('parse — エラー', () => {
  it('中途半端な文は位置つきエラー', () => {
    const r = parse('まる を');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.span).toBeDefined();
  });

  it('閉じていない波かっこ', () => {
    const r = parse('3 かい くりかえす { まる を かく');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain('}');
  });

  it('エラーにはhintがつく', () => {
    const r = parse('まる を');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.hint).toBeTruthy();
  });
});
