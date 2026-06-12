import { describe, expect, it } from 'vitest';
import { STAGE_LOOP } from './features';
import { runMini } from './evaluator';

const run = (src: string) => runMini(src, STAGE_LOOP);

describe('lesson 09 snippets', () => {
  it('A: while x < 5', () => {
    const r = run('x = 0\nwhile x < 5 {\n  x = x + 1\n}\nx');
    expect(r).toEqual({ ok: true, values: [0, 5] });
  });

  it('A-experiment: x + 2 overshoots but stops', () => {
    const r = run('x = 0\nwhile x < 5 {\n  x = x + 2\n}\nx');
    expect(r).toEqual({ ok: true, values: [0, 6] });
  });

  it('B: sum 1..10', () => {
    const r = run(
      'goukei = 0\nkazu = 1\nwhile kazu <= 10 {\n  goukei = goukei + kazu\n  kazu = kazu + 1\n}\ngoukei',
    );
    expect(r).toEqual({ ok: true, values: [0, 1, 55] });
  });

  it('B-experiment: sum 1..100 fits in fuel', () => {
    const r = run(
      'goukei = 0\nkazu = 1\nwhile kazu <= 100 {\n  goukei = goukei + kazu\n  kazu = kazu + 1\n}\ngoukei',
    );
    expect(r).toEqual({ ok: true, values: [0, 1, 5050] });
  });

  it('C: infinite loop hits fuel', () => {
    const r = run('x = 0\nwhile 1 < 2 {\n  x = x + 1\n}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.message).toBe('プログラムがいつまでも とまりませんでした。');
      expect(r.error.hint).toBe('くりかえしの「終わる条件」は、いつか本当に成り立ちますか？');
    }
  });

  it('scaffold without if: fuel error (x never changes)', () => {
    const r = run(
      [
        'x = 27',
        'hosuu = 0',
        'while x > 1 {',
        '  amari = x',
        '  while amari > 100 {',
        '    amari = amari - 100',
        '  }',
        '  while amari > 1 {',
        '    amari = amari - 2',
        '  }',
        '  hosuu = hosuu + 1',
        '}',
        'hosuu',
      ].join('\n'),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('プログラムがいつまでも とまりませんでした。');
  });

  it('D: collatz 27 with two-stride parity = 111 steps', () => {
    const r = run(
      [
        'x = 27',
        'hosuu = 0',
        'while x > 1 {',
        '  amari = x',
        '  while amari > 100 {',
        '    amari = amari - 100',
        '  }',
        '  while amari > 1 {',
        '    amari = amari - 2',
        '  }',
        '  if amari == 0 {',
        '    x = x / 2',
        '  } else {',
        '    x = 3 * x + 1',
        '  }',
        '  hosuu = hosuu + 1',
        '}',
        'hosuu',
      ].join('\n'),
    );
    expect(r).toEqual({ ok: true, values: [27, 0, 111] });
  });

  it('D with comment line (※) still works', () => {
    const r = run(
      [
        'x = 27',
        'hosuu = 0',
        'while x > 1 {',
        '  ※ 偶数しらべ：100ずつ大またで近づき、最後は2ずつ刻む',
        '  amari = x',
        '  while amari > 100 {',
        '    amari = amari - 100',
        '  }',
        '  while amari > 1 {',
        '    amari = amari - 2',
        '  }',
        '  if amari == 0 {',
        '    x = x / 2',
        '  } else {',
        '    x = 3 * x + 1',
        '  }',
        '  hosuu = hosuu + 1',
        '}',
        'hosuu',
      ].join('\n'),
    );
    expect(r).toEqual({ ok: true, values: [27, 0, 111] });
  });

  it('E: collatz 27 with naive subtract-2 parity runs out of fuel', () => {
    const r = run(
      [
        'x = 27',
        'hosuu = 0',
        'while x > 1 {',
        '  amari = x',
        '  while amari > 1 {',
        '    amari = amari - 2',
        '  }',
        '  if amari == 0 {',
        '    x = x / 2',
        '  } else {',
        '    x = 3 * x + 1',
        '  }',
        '  hosuu = hosuu + 1',
        '}',
        'hosuu',
      ].join('\n'),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('プログラムがいつまでも とまりませんでした。');
  });

  it('F: collatz 7 with naive parity works = 16 steps', () => {
    const r = run(
      [
        'x = 7',
        'hosuu = 0',
        'while x > 1 {',
        '  amari = x',
        '  while amari > 1 {',
        '    amari = amari - 2',
        '  }',
        '  if amari == 0 {',
        '    x = x / 2',
        '  } else {',
        '    x = 3 * x + 1',
        '  }',
        '  hosuu = hosuu + 1',
        '}',
        'hosuu',
      ].join('\n'),
    );
    expect(r).toEqual({ ok: true, values: [7, 0, 16] });
  });

  it('G: collatz 6 = 8 steps (small warm-up)', () => {
    const r = run(
      [
        'x = 6',
        'hosuu = 0',
        'while x > 1 {',
        '  amari = x',
        '  while amari > 100 {',
        '    amari = amari - 100',
        '  }',
        '  while amari > 1 {',
        '    amari = amari - 2',
        '  }',
        '  if amari == 0 {',
        '    x = x / 2',
        '  } else {',
        '    x = 3 * x + 1',
        '  }',
        '  hosuu = hosuu + 1',
        '}',
        'hosuu',
      ].join('\n'),
    );
    expect(r).toEqual({ ok: true, values: [6, 0, 8] });
  });
});
