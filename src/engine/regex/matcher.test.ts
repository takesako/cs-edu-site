import { describe, expect, it } from 'vitest';
import { compileRegex, searchAll, testWhole, traceMatch } from './index';

function matches(pattern: string, text: string): string[] {
  const r = searchAll(pattern, text);
  if (!r.ok) throw new Error(`compile failed: ${r.error.message}`);
  return r.matches.map((m) => m.text);
}

function whole(pattern: string, text: string): boolean {
  const r = testWhole(pattern, text);
  if (!r.ok) throw new Error(`compile failed: ${r.error.message}`);
  return r.matched;
}

describe('findMatches: 基本のさがしもの', () => {
  it('リテラル', () => {
    expect(matches('ねこ', 'ねこと、こねこと、ねこじゃらし')).toEqual(['ねこ', 'ねこ', 'ねこ']);
  });

  it('見つからなければ空', () => {
    expect(matches('いぬ', 'ねこの庭')).toEqual([]);
  });

  it('ドットは改行も含めて任意の1文字（v1の決めごと）', () => {
    expect(matches('ね.', 'ねこ ねず ね')).toEqual(['ねこ', 'ねず']);
  });

  it('クラスと範囲', () => {
    expect(matches('[0-9]+', '部屋は203号室、家賃は7万円')).toEqual(['203', '7']);
    expect(matches('[^あ-ん]', 'あかさたなABCはまやらわ')).toEqual(['A', 'B', 'C']);
  });

  it('くりかえしは最長を取る', () => {
    expect(matches('あ+', 'ああああ')).toEqual(['ああああ']);
    expect(matches('わん(わん)*', 'わんわんわん!')).toEqual(['わんわんわん']);
  });

  it('? は0回か1回', () => {
    expect(matches('ねこ?', 'ねことね')).toEqual(['ねこ', 'ね']);
  });

  it('選択', () => {
    expect(matches('ねこ|いぬ', 'いぬとねこ')).toEqual(['いぬ', 'ねこ']);
  });

  it('長さ0のマッチは集めない', () => {
    expect(matches('あ*', 'いいい')).toEqual([]);
  });

  it('マッチは重ならない', () => {
    expect(matches('ああ', 'あああ')).toEqual(['ああ']);
  });

  it('span は UTF-16 単位で slice に使える', () => {
    const r = searchAll('🌱+', '庭に🌱🌱が生えた');
    if (!r.ok) throw new Error('compile failed');
    expect(r.matches).toHaveLength(1);
    const m = r.matches[0];
    expect('庭に🌱🌱が生えた'.slice(m.start, m.end)).toBe('🌱🌱');
  });
});

describe('findMatches: アンカー', () => {
  it('^ は先頭でだけ当たる', () => {
    expect(matches('^ねこ', 'ねこと、ねこ')).toEqual(['ねこ']);
    expect(matches('^ねこ', 'こねこ')).toEqual([]);
  });

  it('$ は末尾でだけ当たる', () => {
    expect(matches('ねこ$', 'ねこと、こねこ')).toEqual(['ねこ']);
    expect(matches('ねこ$', 'ねこじゃらし')).toEqual([]);
  });

  it('^と$で全体指定', () => {
    expect(whole('^[0-9]+$', '12345')).toBe(true);
    expect(whole('^[0-9]+$', '123a5')).toBe(false);
  });
});

describe('matchesWhole', () => {
  it('郵便番号のもよう', () => {
    const yubin = '[0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]';
    expect(whole(yubin, '305-8577')).toBe(true);
    expect(whole(yubin, '3058577')).toBe(false);
    expect(whole(yubin, '305-857')).toBe(false);
  });

  it('空のもようは空の本文にだけ当てはまる', () => {
    expect(whole('', '')).toBe(true);
    expect(whole('', 'あ')).toBe(false);
  });

  it('バックトラック地獄になりがちなパターンも一瞬で終わる（NFA同時シミュレーション）', () => {
    const evil = '(あ*)*う';
    const text = 'あ'.repeat(40) + 'い';
    const t0 = performance.now();
    expect(whole(evil, text)).toBe(false);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe('traceMatch: 状態の集合が動くようすが見える', () => {
  it('1文字ごとに記録が増える', () => {
    const c = compileRegex('あい');
    if (!c.ok) throw new Error('compile failed');
    const steps = traceMatch(c.nfa, 'あい');
    expect(steps).toHaveLength(3);
    expect(steps[0].consumed).toBe(0);
    expect(steps[2].ch).toBe('い');
    expect(steps[2].accepted).toBe(true);
  });

  it('行き止まりで打ち切られる', () => {
    const c = compileRegex('あい');
    if (!c.ok) throw new Error('compile failed');
    const steps = traceMatch(c.nfa, 'かきくけこ');
    expect(steps[steps.length - 1].active).toEqual([]);
    expect(steps.length).toBeLessThan(6);
  });

  it('選択では複数の道を同時に歩く', () => {
    const c = compileRegex('ねこ|ねず');
    if (!c.ok) throw new Error('compile failed');
    const steps = traceMatch(c.nfa, 'ねこ');
    // 「ね」を読んだ時点では、ねこ・ねず両方の道に立っている
    expect(steps[1].active.length).toBeGreaterThan(1);
  });
});

describe('暮らしの中のもよう（レッスン8で使う実例）', () => {
  it('日付', () => {
    expect(matches('[0-9]+月[0-9]+日', '次の集まりは6月12日、その次は7月3日です')).toEqual([
      '6月12日',
      '7月3日',
    ]);
  });

  it('かっこ書き', () => {
    expect(matches('（[^）]*）', 'これ（ここだけ）と、あれ（あそこ）')).toEqual([
      '（ここだけ）',
      '（あそこ）',
    ]);
  });
});
