import { describe, expect, it } from 'vitest';
import { runMini } from './evaluator';
import { STAGES } from './features';

const bool = STAGES['bool']!;

function run(src: string) {
  return runMini(src, bool);
}

describe('lesson 08 snippets', () => {
  it('3 > 2 -> true', () => {
    const r = run('3 > 2');
    expect(r).toEqual({ ok: true, values: [true] });
  });

  it('mixed arithmetic + comparison', () => {
    expect(run('1 + 2 > 4')).toEqual({ ok: true, values: [false] });
    expect(run('2 * 5 == 10')).toEqual({ ok: true, values: [true] });
    expect(run('3 != 3')).toEqual({ ok: true, values: [false] });
  });

  it('if/else with japanese idents', () => {
    const src = 'きおん = 30\nif きおん > 25 {\n  おすすめ = 1\n} else {\n  おすすめ = 2\n}\nおすすめ';
    const r = run(src);
    expect(r).toEqual({ ok: true, values: [30, 1] });
  });

  it('if/else cold branch', () => {
    const src = 'きおん = 10\nif きおん > 25 {\n  おすすめ = 1\n} else {\n  おすすめ = 2\n}\nおすすめ';
    expect(run(src)).toEqual({ ok: true, values: [10, 2] });
  });

  it('if 1 -> runtime error about condition', () => {
    const r = run('if 1 {\n  2\n}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.message).toBe('条件は、true か false で答えられる式にしてください。');
    }
  });

  it('true is an unknown name', () => {
    const r = run('if true {\n  2\n}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('「true」という名前を、まだ知りません');
  });

  it('comparison result stored in variable works as condition', () => {
    const src = 'はれ = 3 > 2\nif はれ {\n  さんぽ = 1\n} else {\n  さんぽ = 0\n}\nさんぽ';
    expect(run(src)).toEqual({ ok: true, values: [true, 1] });
  });

  it('chained comparison is parse error', () => {
    const r = run('1 < 2 < 3');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.message).toBe('くらべた結果を、さらにくらべることはできません。');
    }
  });

  it('exercise starter: lower bound only', () => {
    const src = 'x = 15\nはんいない = 0\nif x >= 10 {\n  はんいない = 1\n}\nはんいない';
    expect(run(src)).toEqual({ ok: true, values: [15, 0, 1] });
  });

  it('exercise solution: nested if range check', () => {
    const mk = (n: number) =>
      `x = ${n}\nはんいない = 0\nif x >= 10 {\n  if x <= 20 {\n    はんいない = 1\n  }\n}\nはんいない`;
    expect(run(mk(15))).toEqual({ ok: true, values: [15, 0, 1] });
    expect(run(mk(25))).toEqual({ ok: true, values: [25, 0, 0] });
    expect(run(mk(5))).toEqual({ ok: true, values: [5, 0, 0] });
    expect(run(mk(10))).toEqual({ ok: true, values: [10, 0, 1] });
    expect(run(mk(20))).toEqual({ ok: true, values: [20, 0, 1] });
  });

  it('while is still locked at bool stage', () => {
    const r = run('while 1 < 2 {\n  1\n}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('くりかえし');
  });

  it('if without else, false cond, leaves nothing extra', () => {
    expect(run('x = 3\nif x > 5 {\n  x = 100\n}\nx')).toEqual({ ok: true, values: [3, 3] });
  });
});
