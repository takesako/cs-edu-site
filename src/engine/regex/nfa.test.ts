import { describe, expect, it } from 'vitest';
import { compileRegex, searchAll, testWhole } from './index';
import { buildNfa, edgeLabelText } from './nfa';
import { parseRegex } from './parser';

describe('buildNfa: 状態機械のかたち', () => {
  it('1文字は状態2つ・辺1本', () => {
    const p = parseRegex('あ');
    if (!p.ok) throw new Error('parse failed');
    const nfa = buildNfa(p.node);
    expect(nfa.stateCount).toBe(2);
    expect(nfa.edges).toHaveLength(1);
    expect(nfa.edges[0]).toMatchObject({ label: { type: 'char', ch: 'あ' } });
  });

  it('くりかえしを足すと状態が増える（機械が育つのが見える）', () => {
    const a = compileRegex('あ');
    const b = compileRegex('あ*');
    if (!a.ok || !b.ok) throw new Error('compile failed');
    expect(b.nfa.stateCount).toBeGreaterThan(a.nfa.stateCount);
  });

  it('空のもようは ε 1本', () => {
    const p = parseRegex('');
    if (!p.ok) throw new Error('parse failed');
    const nfa = buildNfa(p.node);
    expect(nfa.edges).toEqual([{ from: nfa.start, to: nfa.accept, label: { type: 'eps' } }]);
  });
});

describe('edgeLabelText: 可視化用ラベル', () => {
  it('各ラベルの表示', () => {
    expect(edgeLabelText({ type: 'eps' })).toBe('ε');
    expect(edgeLabelText({ type: 'char', ch: 'あ' })).toBe('あ');
    expect(edgeLabelText({ type: 'any' })).toBe('.');
    expect(
      edgeLabelText({
        type: 'class',
        negated: false,
        items: [
          { type: 'range', from: '0', to: '9' },
          { type: 'ch', ch: '-' },
        ],
      }),
    ).toBe('[0-9-]');
    expect(edgeLabelText({ type: 'class', negated: true, items: [{ type: 'ch', ch: 'あ' }] })).toBe(
      '[^あ]',
    );
    expect(edgeLabelText({ type: 'anchor', at: 'start' })).toBe('^');
    expect(edgeLabelText({ type: 'anchor', at: 'end' })).toBe('$');
  });
});

describe('便利関数のエラー経路', () => {
  it('searchAll は壊れたパターンのエラーをそのまま返す', () => {
    const r = searchAll('(ねこ', 'ねこ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('閉じられていません');
  });

  it('testWhole も同じ', () => {
    const r = testWhole('[', 'あ');
    expect(r.ok).toBe(false);
  });
});
