import { classMatches, type Edge, type Nfa } from './nfa';

/** 本文の中で当てはまった範囲（UTF-16単位。slice にそのまま使える） */
export interface MatchSpan {
  start: number;
  end: number;
  text: string;
}

/** 可視化用：1文字読むごとの「いま立っている状態の集合」 */
export interface TraceStep {
  /** この時点までに読んだ文字数（コードポイント単位） */
  consumed: number;
  /** 読んだ文字（最初の1歩はなし） */
  ch?: string;
  /** いま同時に立っている状態 */
  active: number[];
  /** 受理状態を含むか */
  accepted: boolean;
}

interface Pos {
  ch: string;
  at: number;
}

function codePoints(text: string): Pos[] {
  const out: Pos[] = [];
  let at = 0;
  for (const ch of text) {
    out.push({ ch, at });
    at += ch.length;
  }
  return out;
}

/** from→[edges] の隣接表（毎回 edges を総なめしない） */
function adjacency(nfa: Nfa): Edge[][] {
  const adj: Edge[][] = Array.from({ length: nfa.stateCount }, () => []);
  for (const e of nfa.edges) adj[e.from].push(e);
  return adj;
}

/**
 * ε閉包：文字を読まずに行ける状態をぜんぶ集める。
 * anchor の辺は、いまの位置（i=何文字目/全n文字）が合うときだけ通れる。
 */
function closure(adj: Edge[][], states: Set<number>, i: number, n: number): Set<number> {
  const out = new Set(states);
  const stack = [...states];
  while (stack.length > 0) {
    const s = stack.pop()!;
    for (const e of adj[s]) {
      const passable =
        e.label.type === 'eps' ||
        (e.label.type === 'anchor' && (e.label.at === 'start' ? i === 0 : i === n));
      if (passable && !out.has(e.to)) {
        out.add(e.to);
        stack.push(e.to);
      }
    }
  }
  return out;
}

function step(adj: Edge[][], states: Set<number>, ch: string): Set<number> {
  const out = new Set<number>();
  for (const s of states) {
    for (const e of adj[s]) {
      const label = e.label;
      const hit =
        (label.type === 'char' && label.ch === ch) ||
        label.type === 'any' ||
        (label.type === 'class' && classMatches(label.negated, label.items, ch));
      if (hit) out.add(e.to);
    }
  }
  return out;
}

/**
 * テキスト先頭 from 文字目（コードポイント単位）から始まる最長マッチの長さを返す。
 * 当てはまらなければ -1。長さ0のマッチは 0。
 */
function longestFrom(adj: Edge[][], nfa: Nfa, chars: Pos[], from: number): number {
  const n = chars.length;
  let states = closure(adj, new Set([nfa.start]), from, n);
  let best = states.has(nfa.accept) ? 0 : -1;
  for (let i = from; i < n; i++) {
    states = step(adj, states, chars[i].ch);
    if (states.size === 0) break;
    states = closure(adj, states, i + 1, n);
    if (states.has(nfa.accept)) best = i + 1 - from;
  }
  return best;
}

/**
 * 本文の中から、左から順に・重ならないように・各位置で最長のマッチを集める。
 * 長さ0のマッチは集めない（ハイライトできないため）。
 */
export function findMatches(nfa: Nfa, text: string): MatchSpan[] {
  const adj = adjacency(nfa);
  const chars = codePoints(text);
  const out: MatchSpan[] = [];
  let i = 0;
  while (i < chars.length) {
    const len = longestFrom(adj, nfa, chars, i);
    if (len > 0) {
      const start = chars[i].at;
      const last = chars[i + len - 1];
      const end = last.at + last.ch.length;
      out.push({ start, end, text: text.slice(start, end) });
      i += len;
    } else {
      i += 1;
    }
  }
  return out;
}

/** 本文ぜんぶが、もように当てはまるか（先頭から末尾まで） */
export function matchesWhole(nfa: Nfa, text: string): boolean {
  const adj = adjacency(nfa);
  const chars = codePoints(text);
  return longestFrom(adj, nfa, chars, 0) === chars.length;
}

/**
 * 可視化用：先頭から1文字ずつ読みながら、状態の集合がどう動くかを記録する。
 * 「同時に複数の道を歩く」というNFAの読み方そのものを見せるための関数。
 */
export function traceMatch(nfa: Nfa, text: string): TraceStep[] {
  const adj = adjacency(nfa);
  const chars = codePoints(text);
  const n = chars.length;
  const steps: TraceStep[] = [];
  let states = closure(adj, new Set([nfa.start]), 0, n);
  steps.push({ consumed: 0, active: [...states].sort((a, b) => a - b), accepted: states.has(nfa.accept) });
  for (let i = 0; i < n; i++) {
    states = closure(adj, step(adj, states, chars[i].ch), i + 1, n);
    steps.push({
      consumed: i + 1,
      ch: chars[i].ch,
      active: [...states].sort((a, b) => a - b),
      accepted: states.has(nfa.accept),
    });
    if (states.size === 0) break;
  }
  return steps;
}
