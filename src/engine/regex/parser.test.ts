import { describe, expect, it } from 'vitest';
import { parseRegex } from './parser';

function ok(pattern: string) {
  const r = parseRegex(pattern);
  if (!r.ok) throw new Error(`parse failed: ${r.error.message}`);
  return r.node;
}

function ng(pattern: string) {
  const r = parseRegex(pattern);
  if (r.ok) throw new Error('expected error');
  return r.error;
}

describe('parseRegex: 基本', () => {
  it('1文字', () => {
    expect(ok('あ')).toMatchObject({ kind: 'char', ch: 'あ' });
  });

  it('連接', () => {
    const n = ok('ねこ');
    expect(n).toMatchObject({
      kind: 'concat',
      parts: [
        { kind: 'char', ch: 'ね' },
        { kind: 'char', ch: 'こ' },
      ],
    });
  });

  it('空のもようも読める', () => {
    expect(ok('')).toMatchObject({ kind: 'concat', parts: [] });
  });

  it('ドット', () => {
    expect(ok('.')).toMatchObject({ kind: 'any' });
  });

  it('サロゲートペアも1文字', () => {
    const n = ok('🌱?');
    expect(n).toMatchObject({ kind: 'repeat', op: '?', child: { kind: 'char', ch: '🌱' } });
  });

  it('Spanは UTF-16 単位', () => {
    const n = ok('a🌱b');
    expect(n.kind).toBe('concat');
    if (n.kind === 'concat') {
      expect(n.parts[1].span).toEqual({ start: 1, end: 3 });
      expect(n.parts[2].span).toEqual({ start: 3, end: 4 });
    }
  });
});

describe('parseRegex: くりかえしと選択', () => {
  it('* + ?', () => {
    expect(ok('あ*')).toMatchObject({ kind: 'repeat', op: '*' });
    expect(ok('あ+')).toMatchObject({ kind: 'repeat', op: '+' });
    expect(ok('あ?')).toMatchObject({ kind: 'repeat', op: '?' });
  });

  it('くりかえしの重ねがけ（a*? など）も構文としては読める', () => {
    expect(ok('あ*?')).toMatchObject({ kind: 'repeat', op: '?', child: { kind: 'repeat', op: '*' } });
  });

  it('選択', () => {
    const n = ok('ねこ|いぬ|とり');
    expect(n).toMatchObject({ kind: 'alt' });
    if (n.kind === 'alt') expect(n.options).toHaveLength(3);
  });

  it('グループ', () => {
    const n = ok('(ねこ|いぬ)ごや');
    expect(n.kind).toBe('concat');
    if (n.kind === 'concat') expect(n.parts[0]).toMatchObject({ kind: 'group' });
  });

  it('グループへのくりかえし', () => {
    expect(ok('(わん)+')).toMatchObject({ kind: 'repeat', op: '+', child: { kind: 'group' } });
  });
});

describe('parseRegex: 文字クラスとアンカー', () => {
  it('文字の列挙', () => {
    const n = ok('[あいう]');
    expect(n).toMatchObject({
      kind: 'class',
      negated: false,
      items: [
        { type: 'ch', ch: 'あ' },
        { type: 'ch', ch: 'い' },
        { type: 'ch', ch: 'う' },
      ],
    });
  });

  it('範囲と否定', () => {
    expect(ok('[0-9]')).toMatchObject({ kind: 'class', items: [{ type: 'range', from: '0', to: '9' }] });
    expect(ok('[^0-9]')).toMatchObject({ kind: 'class', negated: true });
  });

  it('末尾の - はただの文字', () => {
    const n = ok('[あ-]');
    expect(n).toMatchObject({
      kind: 'class',
      items: [
        { type: 'ch', ch: 'あ' },
        { type: 'ch', ch: '-' },
      ],
    });
  });

  it('クラス内エスケープ', () => {
    expect(ok('[\\]]')).toMatchObject({ kind: 'class', items: [{ type: 'ch', ch: ']' }] });
  });

  it('アンカー', () => {
    const n = ok('^ねこ$');
    expect(n.kind).toBe('concat');
    if (n.kind === 'concat') {
      expect(n.parts[0]).toMatchObject({ kind: 'anchor', at: 'start' });
      expect(n.parts[3]).toMatchObject({ kind: 'anchor', at: 'end' });
    }
  });

  it('エスケープで記号をただの文字に', () => {
    expect(ok('\\.')).toMatchObject({ kind: 'char', ch: '.' });
    expect(ok('\\*')).toMatchObject({ kind: 'char', ch: '*' });
  });
});

describe('parseRegex: エラーは日本語で場所つき', () => {
  it('行き場のない )', () => {
    const e = ng('ねこ)');
    expect(e.message).toContain('「(」が見つかりません');
    expect(e.span.start).toBe(2);
  });

  it('閉じられない (', () => {
    const e = ng('(ねこ');
    expect(e.message).toContain('閉じられていません');
    expect(e.hint).toContain(')');
  });

  it('閉じられない [', () => {
    expect(ng('[あいう').message).toContain('「[」が、閉じられていません');
  });

  it('からっぽのクラス', () => {
    expect(ng('[]').message).toContain('からっぽ');
  });

  it('逆さまの範囲', () => {
    const e = ng('[9-0]');
    expect(e.message).toContain('逆さま');
    expect(e.hint).toContain('0-9');
  });

  it('相手のいないくりかえし', () => {
    const e = ng('*');
    expect(e.message).toContain('相手がいません');
    expect(ng('(+)').message).toContain('相手がいません');
    expect(ng('あ|*').message).toContain('相手がいません');
  });

  it('アンカーへのくりかえし', () => {
    expect(ng('^*').message).toContain('つけられません');
    expect(ng('$+').hint).toContain('位置');
  });

  it('末尾のバックスラッシュ', () => {
    expect(ng('ねこ\\').message).toContain('後ろに文字がありません');
  });
});
