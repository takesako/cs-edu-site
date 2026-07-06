import { describe, it, expect } from 'vitest';
import { run } from './index';
import { show, kindName, bool } from './values';

function okRun(source: string) {
  const r = run(source);
  if (!r.ok) throw new Error(`run failed: ${r.error.message}`);
  return r;
}

function errRun(source: string) {
  const r = run(source);
  if (r.ok) throw new Error('expected error');
  return r.error;
}

describe('show — 値の見せ方', () => {
  it('ほんとう／うそ', () => {
    expect(okRun('3 が 2 より おおきい と いう').output).toEqual(['ほんとう']);
    expect(okRun('3 が 2 より ちいさい と いう').output).toEqual(['うそ']);
    expect(show(bool(true))).toBe('ほんとう');
  });

  it('色・形・ことば', () => {
    expect(okRun('あか と いう').output[0]).toContain('いろ');
    expect(okRun('まる と いう').output).toEqual(['まる']);
    expect(okRun('ほし と いう').output).toEqual(['ほし']);
    expect(okRun('さんかく と いう').output).toEqual(['さんかく']);
    expect(okRun('しかく と いう').output).toEqual(['しかく']);
    expect(okRun('はな とは { まる を かく }\nはな と いう').output[0]).toContain('はな');
  });

  it('kindName が全種類に日本語名を返す', () => {
    expect(kindName({ type: 'number', value: 1 })).toBe('数');
    expect(kindName({ type: 'string', value: 'a' })).toBe('文字列');
    expect(kindName({ type: 'boolean', value: true })).toBe('ほんとうかうそか');
    expect(kindName({ type: 'color', value: '#fff' })).toBe('色');
    expect(kindName({ type: 'shape', kind: 'circle' })).toBe('形');
    expect(kindName({ type: 'routine', name: 'x', body: [] })).toBe('ことば（手順）');
  });
});

describe('エラー経路の網羅', () => {
  it('数でないもので すすむ／まわる', () => {
    expect(errRun('「あ」 すすむ').message).toContain('数');
    expect(errRun('みぎ へ 「あ」 まわる').message).toContain('数');
  });

  it('形どうしの足し算・引き算', () => {
    expect(errRun('まる + 1 と いう').message).toContain('足せ');
    expect(errRun('まる - 1 と いう').message).toContain('数');
  });

  it('ふとさ・おおきさに数以外', () => {
    expect(errRun('ふとさ を 「ふとい」 にする').message).toContain('数');
  });

  it('知らない名前への付け替え', () => {
    expect(errRun('なぞ を 1 にする').message).toContain('なぞ');
  });

  it('小数回のくりかえし', () => {
    expect(errRun('2.5 かい くりかえす { まる を かく }').message).toContain('整数');
  });

  it('数だけの文は文にならない', () => {
    expect(errRun('1 を x とよぶ\nx').message).toContain('文');
  });

  it('色は かけない', () => {
    expect(errRun('あか を かく').message).toContain('形');
  });

  it('もし の条件が真偽でない', () => {
    expect(errRun('もし 1 ならば { まる を かく }').message).toContain('もし');
  });

  it('くらべられないものの大小', () => {
    expect(errRun('もし 「あ」 が 1 より おおきい ならば { まる を かく }').message).toContain('数');
  });

  it('定義の二重定義', () => {
    expect(errRun('はな とは { まる を かく }\nはな とは { ほし を かく }').message).toContain(
      'すでに',
    );
  });
});

describe('正常系の網羅', () => {
  it('ひだりまわり・引き算・割り算・かっこ・マイナス', () => {
    const r = okRun('ひだり へ 90 まわる\n( 10 - 4 ) ÷ 2 すすむ\n-5 + 5 と いう');
    expect(r.drawing[0]).toMatchObject({ kind: 'line' });
    expect(r.output).toEqual(['0']);
  });

  it('ちがう種類の おなじ くらべは うそ', () => {
    expect(okRun('「1」 が 1 と おなじ と いう').output).toEqual(['うそ']);
  });

  it('文字列どうしの おなじ', () => {
    expect(okRun('「はな」 が 「はな」 と おなじ と いう').output).toEqual(['ほんとう']);
  });

  it('ちがう比較', () => {
    expect(okRun('1 が 1 と ちがう と いう').output).toEqual(['うそ']);
    expect(okRun('1 が 2 と ちがう と いう').output).toEqual(['ほんとう']);
    expect(okRun('「はな」 が 「にわ」 と ちがう と いう').output).toEqual(['ほんとう']);
    expect(okRun('「1」 が 1 と ちがう と いう').output).toEqual(['ほんとう']);
  });

  it('ことばの中から外の名前を付け替えられる', () => {
    const r = okRun('0 を かず とよぶ\nふやす とは { かず を かず + 1 にする }\nふやす\nふやす\nかず と いう');
    expect(r.output).toEqual(['2']);
  });

  it('数と文字列の足し算はつなげる', () => {
    expect(okRun('「答えは」 + 7 と いう').output).toEqual(['答えは7']);
  });

  it('おおきさ・いろ・ふとさを変えて描ける', () => {
    const r = okRun('おおきさ を 40 にする\nふとさ を 1 にする\nいろ を みどり にする\nまる を かく');
    expect(r.drawing[0]).toMatchObject({ kind: 'circle', r: 20, width: 1, color: '#4a7c59' });
  });
});
