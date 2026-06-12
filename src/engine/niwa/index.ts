/**
 * にわ語 — 言語の庭の教材用ミニ言語。
 *
 * 公開API:
 *   tokenize(source) — 字句解析
 *   parse(source)    — 構文解析（AST）
 *   run(source)      — 実行（描画コマンド列＋テキスト出力）
 */
import { evaluate, type EvalResult } from './evaluator';
import { parse } from './parser';

export { tokenize } from './tokenizer';
export { parse } from './parser';
export { evaluate } from './evaluator';
export type { Token, TokenKind, Span } from './token';
export type { Program, Stmt, Expr } from './ast';
export type { NiwaError, Result } from './errors';
export type { DrawCommand, Point, RunOutput, EvalResult } from './evaluator';
export type { Value } from './values';
export { COLOR_WORDS, INK } from './colors';

export function run(source: string): EvalResult {
  const p = parse(source);
  if (!p.ok) return p;
  return evaluate(p.program);
}
