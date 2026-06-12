import { describe, expect, it } from 'vitest';
import { BLANK, findRule, runMachine, tapeToString, type Machine } from './machine';
import { ADD, FLIP, FOREVER, INCREMENT } from './programs';

describe('うらがえす（FLIP）', () => {
  it('0110 → 1001 で止まる', () => {
    const r = runMachine(FLIP.machine, '0110');
    expect(r.halted).toBe(true);
    expect(r.finalTape).toBe('1001');
    expect(r.steps).toBe(5); // 4文字＋空白で停止判断
  });

  it('空のテープなら1歩で止まる', () => {
    const r = runMachine(FLIP.machine, '');
    expect(r.halted).toBe(true);
    expect(r.steps).toBe(1);
  });

  it('場面の記録が1歩ずつ残る', () => {
    const r = runMachine(FLIP.machine, '01');
    expect(r.frames).toHaveLength(r.steps + 1);
    expect(r.frames[0].state).toBe('すすむ');
    expect(r.frames[0].applied).toBeUndefined();
    expect(r.frames[1].applied).toMatchObject({ read: '0', write: '1' });
    expect(r.frames.at(-1)!.halted).toBe(true);
  });
});

describe('1をたす（INCREMENT）', () => {
  it.each([
    ['1011', '1100'], // 11 + 1 = 12
    ['0', '1'],
    ['1', '10'],
    ['111', '1000'], // くりあがりの連鎖
    ['10', '11'],
  ])('%s + 1 = %s', (input, expected) => {
    const r = runMachine(INCREMENT.machine, input);
    expect(r.halted).toBe(true);
    expect(r.finalTape).toBe(expected);
  });
});

describe('たしざん（ADD）', () => {
  it('111+11 → 11111', () => {
    const r = runMachine(ADD.machine, '111+11');
    expect(r.halted).toBe(true);
    expect(r.finalTape).toBe('11111');
  });

  it('1+1 → 11', () => {
    expect(runMachine(ADD.machine, '1+1').finalTape).toBe('11');
  });
});

describe('とまらない（FOREVER）', () => {
  it('fuelで打ち切られ、halted=false', () => {
    const r = runMachine(FOREVER.machine, '', 200);
    expect(r.halted).toBe(false);
    expect(r.stuck).toBe(false);
    expect(r.steps).toBe(200);
    expect(r.frames).toHaveLength(201);
  });
});

describe('機械のへり', () => {
  const STUCK: Machine = {
    start: 'はじめ',
    halt: 'おわり',
    rules: [{ state: 'はじめ', read: '1', write: '1', move: 'R', next: 'はじめ' }],
  };

  it('表に規則がないと手詰まり（stuck）', () => {
    const r = runMachine(STUCK, '10');
    expect(r.stuck).toBe(true);
    expect(r.halted).toBe(false);
    expect(r.frames.at(-1)!.stuck).toBe(true);
  });

  it('テープは左にも伸びる', () => {
    const LEFT: Machine = {
      start: 'ひだりへ',
      halt: 'おわり',
      rules: [
        { state: 'ひだりへ', read: BLANK, write: 'あ', move: 'L', next: 'かく' },
        { state: 'かく', read: BLANK, write: 'い', move: 'N', next: 'おわり' },
      ],
    };
    const r = runMachine(LEFT, '');
    expect(r.finalTape).toBe('いあ');
  });

  it('findRule は状態×記号で1行を引く', () => {
    expect(findRule(FLIP.machine, 'すすむ', '0')).toMatchObject({ write: '1' });
    expect(findRule(FLIP.machine, 'すすむ', 'x')).toBeUndefined();
  });

  it('tapeToString は空白を＿で埋める', () => {
    expect(tapeToString({ 0: 'あ', 2: 'い' })).toBe('あ＿い');
    expect(tapeToString({})).toBe('');
  });

  it('書きこみが BLANK ならマスが消える', () => {
    const r = runMachine(ADD.machine, '1+1');
    // 最後の場面のテープに、消した右端のマスがない
    const last = r.frames.at(-1)!;
    expect(Object.values(last.tape).every((v) => v !== BLANK)).toBe(true);
  });
});
