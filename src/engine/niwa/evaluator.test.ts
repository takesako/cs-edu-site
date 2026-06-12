import { describe, it, expect } from 'vitest';
import { run } from './index';
import type { DrawCommand } from './evaluator';

function okRun(source: string) {
  const r = run(source);
  if (!r.ok) throw new Error(`run failed: ${r.error.message}`);
  return r;
}

describe('run — 描画', () => {
  it('まる を かく → circleコマンドが出る', () => {
    const r = okRun('まる を かく');
    expect(r.drawing).toHaveLength(1);
    expect(r.drawing[0]).toMatchObject({ kind: 'circle', x: 0, y: 0 });
  });

  it('すすむ → 上向きに線が引かれる（初期の向きは上）', () => {
    const r = okRun('50 すすむ');
    expect(r.drawing[0]).toMatchObject({ kind: 'line', x1: 0, y1: 0, x2: 0, y2: -50 });
  });

  it('みぎ へ 90 まわる → 右（+x）へ進む', () => {
    const r = okRun('みぎ へ 90 まわる\n50 すすむ');
    expect(r.drawing[0]).toMatchObject({ kind: 'line', x2: 50, y2: 0 });
  });

  it('いろ を あか にする → 後続の描画が赤になる', () => {
    const r = okRun('いろ を あか にする\nまる を かく');
    expect((r.drawing[0] as DrawCommand & { color: string }).color).toBe('#c4503c');
  });

  it('さんかく・しかく・ほし はpolygonになる', () => {
    const r = okRun('さんかく を かく\nしかく を かく\nほし を かく');
    expect(r.drawing.every((c) => c.kind === 'polygon')).toBe(true);
  });
});

describe('run — ことばと値', () => {
  it('いう文がテキストを出す', () => {
    const r = okRun('「こんにちは」 と いう\n1 + 2 × 3 と いう');
    expect(r.output).toEqual(['こんにちは', '7']);
  });

  it('名づけと参照', () => {
    const r = okRun('90 を かくど とよぶ\nかくど と いう');
    expect(r.output).toEqual(['90']);
  });

  it('名前の付け替え', () => {
    const r = okRun('10 を x とよぶ\nx を x + 5 にする\nx と いう');
    expect(r.output).toEqual(['15']);
  });

  it('くりかえし', () => {
    const r = okRun('4 かい くりかえす { 25 すすむ\nみぎ へ 90 まわる }');
    expect(r.drawing).toHaveLength(4);
    // 正方形を一周して原点に戻る
    const last = r.drawing[3] as DrawCommand & { x2: number; y2: number };
    expect(last.x2).toBeCloseTo(0, 5);
    expect(last.y2).toBeCloseTo(0, 5);
  });

  it('もし〜ならば〜ちがえば', () => {
    const r = okRun('もし 3 が 2 より おおきい ならば { 「はい」 と いう } ちがえば { 「いいえ」 と いう }');
    expect(r.output).toEqual(['はい']);
    const r2 = okRun('もし 1 が 2 より おおきい ならば { 「はい」 と いう } ちがえば { 「いいえ」 と いう }');
    expect(r2.output).toEqual(['いいえ']);
  });

  it('ことばの定義と呼び出し（はなびら を かく も通じる）', () => {
    const src = 'はなびら とは { まる を かく }\nはなびら\nはなびら を かく';
    const r = okRun(src);
    expect(r.drawing).toHaveLength(2);
  });

  it('文字列の足し算はつなげる', () => {
    const r = okRun('「こと」 + 「ば」 と いう');
    expect(r.output).toEqual(['ことば']);
  });
});

describe('run — 誠実なエラー', () => {
  it('知らない名前：名前そのものを伝える', () => {
    const r = run('おおきい まる を かく');
    expect(r.ok).toBe(false);
  });

  it('未定義の名前のエラーメッセージに名前が入る', () => {
    const r = run('はな を かく');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain('はな');
  });

  it('0では割れません', () => {
    const r = run('10 ÷ 0 と いう');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toContain('0');
  });

  it('数でないものでは回数指定できない', () => {
    const r = run('「さん」 かい くりかえす { まる を かく }');
    expect(r.ok).toBe(false);
  });

  it('終わらない再帰はfuel切れで止まる', () => {
    const r = run('ぐるぐる とは { ぐるぐる }\nぐるぐる');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/とま|終わ/);
  });

  it('同じ名前の二重定義はエラー（にする への導線つき）', () => {
    const r = run('1 を x とよぶ\n2 を x とよぶ');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.hint).toContain('にする');
  });

  it('色でないものに いろ を変えられない', () => {
    const r = run('いろ を 42 にする');
    expect(r.ok).toBe(false);
  });
});
