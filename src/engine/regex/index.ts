/**
 * regex — コース3「もようをさがすことば」の教材エンジン。
 * JSのRegExpは使わず、パターン→構文木→状態機械（NFA）→同時シミュレーション
 * という「中の見える」実装。バックトラックしないので、暴走するパターンが書けない。
 */
export type { ClassItem, RegexNode, Span } from './ast';
export type { RegexError, Result } from './errors';
export type { Edge, EdgeLabel, Nfa } from './nfa';
export { buildNfa, classMatches, edgeLabelText } from './nfa';
export type { ParseResult } from './parser';
export { parseRegex } from './parser';
export type { MatchSpan, TraceStep } from './matcher';
export { findMatches, matchesWhole, traceMatch } from './matcher';

import type { RegexNode } from './ast';
import type { Result } from './errors';
import { buildNfa, type Nfa } from './nfa';
import { findMatches, matchesWhole, type MatchSpan } from './matcher';
import { parseRegex } from './parser';

export type CompileResult = Result<{ node: RegexNode; nfa: Nfa }>;

/** パターンを一度に構文木＋状態機械へ */
export function compileRegex(pattern: string): CompileResult {
  const parsed = parseRegex(pattern);
  if (!parsed.ok) return parsed;
  return { ok: true, node: parsed.node, nfa: buildNfa(parsed.node) };
}

export type SearchResult = Result<{ matches: MatchSpan[] }>;

/** 一発で「本文の中のマッチぜんぶ」を返す便利関数 */
export function searchAll(pattern: string, text: string): SearchResult {
  const compiled = compileRegex(pattern);
  if (!compiled.ok) return compiled;
  return { ok: true, matches: findMatches(compiled.nfa, text) };
}

/** 一発で「本文ぜんぶが当てはまるか」 */
export function testWhole(pattern: string, text: string): Result<{ matched: boolean }> {
  const compiled = compileRegex(pattern);
  if (!compiled.ok) return compiled;
  return { ok: true, matched: matchesWhole(compiled.nfa, text) };
}
