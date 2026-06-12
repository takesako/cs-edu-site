import { describe, expect, it } from 'vitest';
import { STAGE_FUNC } from './features';
import { runMini } from './evaluator';

const run = (src: string) => runMini(src, STAGE_FUNC);

describe('lesson 10 draft snippets', () => {
  it('A: fn double', () => {
    const r = run('fn double(x) {\n  x * 2\n}\n\ndouble(21)');
    expect(r).toEqual({ ok: true, values: [42] });
  });

  it('B: two args + composition', () => {
    const r = run(
      'fn double(x) {\n  x * 2\n}\n\nfn add(a, b) {\n  a + b\n}\n\nadd(double(3), 4)\ndouble(add(1, 20))',
    );
    expect(r).toEqual({ ok: true, values: [10, 42] });
  });

  it('B2: wrong arg count', () => {
    const r = run('fn add(a, b) {\n  a + b\n}\n\nadd(3)');
    expect(r.ok).toBe(false);
    if (!r.ok) console.log('B2:', r.error.message, '|', r.error.hint);
  });

  it('C: scope leak error', () => {
    const r = run('fn f(a) {\n  a\n}\n\nf(10)\na');
    expect(r.ok).toBe(false);
    if (!r.ok) console.log('C:', r.error.message, '|', r.error.hint);
  });

  it('C2: shadowing keeps outer intact', () => {
    const r = run('x = 100\n\nfn f(x) {\n  x + 1\n}\n\nf(5)\nx');
    expect(r).toEqual({ ok: true, values: [100, 6, 100] });
  });

  it('D: fact(5)', () => {
    const r = run(
      'fn fact(n) {\n  if n < 2 {\n    1\n  } else {\n    n * fact(n - 1)\n  }\n}\n\nfact(5)',
    );
    expect(r).toEqual({ ok: true, values: [120] });
  });

  it('E: fact without else -> no value', () => {
    const r = run('fn fact(n) {\n  if n < 2 {\n    1\n  }\n}\n\nfact(5)');
    expect(r.ok).toBe(false);
    if (!r.ok) console.log('E:', r.error.message, '|', r.error.hint);
  });

  it('F: infinite recursion -> depth limit', () => {
    const r = run('fn f(n) {\n  f(n + 1)\n}\n\nf(0)');
    expect(r.ok).toBe(false);
    if (!r.ok) console.log('F:', r.error.message, '|', r.error.hint);
  });

  it('G: fib recursive', () => {
    const r = run(
      'fn fib(n) {\n  if n < 2 {\n    n\n  } else {\n    fib(n - 1) + fib(n - 2)\n  }\n}\n\nfib(10)',
    );
    expect(r).toEqual({ ok: true, values: [55] });
  });

  it('H: fib while version', () => {
    const r = run(
      'fn fib(n) {\n  a = 0\n  b = 1\n  i = 0\n  while i < n {\n    t = a + b\n    a = b\n    b = t\n    i = i + 1\n  }\n  a\n}\n\nfib(10)',
    );
    expect(r).toEqual({ ok: true, values: [55] });
  });

  it('I: fn def leaves no value at top level', () => {
    const r = run('fn double(x) {\n  x * 2\n}');
    expect(r).toEqual({ ok: true, values: [] });
  });
});
