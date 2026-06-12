import type { ClassItem, RegexNode } from './ast';

/**
 * 遷移のラベル。eps は「文字を読まずに移れる」しるし。
 * anchor は位置（先頭・末尾）でだけ通れる eps。
 */
export type EdgeLabel =
  | { type: 'eps' }
  | { type: 'char'; ch: string }
  | { type: 'any' }
  | { type: 'class'; negated: boolean; items: ClassItem[] }
  | { type: 'anchor'; at: 'start' | 'end' };

export interface Edge {
  from: number;
  to: number;
  label: EdgeLabel;
}

/** トンプソン構成で作る、入口1つ・出口1つの状態機械 */
export interface Nfa {
  stateCount: number;
  start: number;
  accept: number;
  edges: Edge[];
}

/** 構文木から状態機械を組み立てる（Thompson構成） */
export function buildNfa(node: RegexNode): Nfa {
  const builder = new Builder();
  const frag = builder.build(node);
  return {
    stateCount: builder.count,
    start: frag.start,
    accept: frag.accept,
    edges: builder.edges,
  };
}

interface Frag {
  start: number;
  accept: number;
}

class Builder {
  count = 0;
  edges: Edge[] = [];

  private state(): number {
    return this.count++;
  }

  private edge(from: number, to: number, label: EdgeLabel): void {
    this.edges.push({ from, to, label });
  }

  build(node: RegexNode): Frag {
    switch (node.kind) {
      case 'char': {
        const s = this.state();
        const a = this.state();
        this.edge(s, a, { type: 'char', ch: node.ch });
        return { start: s, accept: a };
      }
      case 'any': {
        const s = this.state();
        const a = this.state();
        this.edge(s, a, { type: 'any' });
        return { start: s, accept: a };
      }
      case 'class': {
        const s = this.state();
        const a = this.state();
        this.edge(s, a, { type: 'class', negated: node.negated, items: node.items });
        return { start: s, accept: a };
      }
      case 'anchor': {
        const s = this.state();
        const a = this.state();
        this.edge(s, a, { type: 'anchor', at: node.at });
        return { start: s, accept: a };
      }
      case 'group':
        return this.build(node.child);
      case 'concat': {
        if (node.parts.length === 0) {
          // 空のもよう：読まずに通れる1本道
          const s = this.state();
          const a = this.state();
          this.edge(s, a, { type: 'eps' });
          return { start: s, accept: a };
        }
        const frags = node.parts.map((p) => this.build(p));
        for (let i = 0; i < frags.length - 1; i++) {
          this.edge(frags[i].accept, frags[i + 1].start, { type: 'eps' });
        }
        return { start: frags[0].start, accept: frags[frags.length - 1].accept };
      }
      case 'alt': {
        const s = this.state();
        const a = this.state();
        for (const option of node.options) {
          const f = this.build(option);
          this.edge(s, f.start, { type: 'eps' });
          this.edge(f.accept, a, { type: 'eps' });
        }
        return { start: s, accept: a };
      }
      case 'repeat': {
        const inner = this.build(node.child);
        const s = this.state();
        const a = this.state();
        this.edge(s, inner.start, { type: 'eps' });
        this.edge(inner.accept, a, { type: 'eps' });
        if (node.op === '*' || node.op === '?') {
          this.edge(s, a, { type: 'eps' }); // 0回でもよい
        }
        if (node.op === '*' || node.op === '+') {
          this.edge(inner.accept, inner.start, { type: 'eps' }); // もう一周
        }
        return { start: s, accept: a };
      }
    }
  }
}

/** 文字クラスに ch が当てはまるか */
export function classMatches(negated: boolean, items: ClassItem[], ch: string): boolean {
  const code = ch.codePointAt(0)!;
  const hit = items.some((item) =>
    item.type === 'ch'
      ? item.ch === ch
      : item.from.codePointAt(0)! <= code && code <= item.to.codePointAt(0)!,
  );
  return negated ? !hit : hit;
}

/** 可視化用：遷移ラベルの表示文字列 */
export function edgeLabelText(label: EdgeLabel): string {
  switch (label.type) {
    case 'eps':
      return 'ε';
    case 'char':
      return label.ch;
    case 'any':
      return '.';
    case 'class': {
      const body = label.items
        .map((i) => (i.type === 'ch' ? i.ch : `${i.from}-${i.to}`))
        .join('');
      return `[${label.negated ? '^' : ''}${body}]`;
    }
    case 'anchor':
      return label.at === 'start' ? '^' : '$';
  }
}
