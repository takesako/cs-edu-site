/**
 * minilang — コース2「じぶんの言語をつくる」の教材言語。
 * 数式の電卓から始まり、機能フラグで段階的に育つ。
 * にわ語と同じ Result/Span/日本語エラーの作法に従う。
 */
import { err, type NiwaError, type Result } from '../niwa/errors';
import type { Span } from '../niwa/token';
import type { LanguageFeatures } from './features';

export type { LanguageFeatures } from './features';
export { STAGES, STAGE_NUMBER, STAGE_ADD, STAGE_CALC, STAGE_VAR } from './features';

/* ---------- トークン ---------- */

export type MiniTokenKind = 'number' | 'op' | 'lparen' | 'rparen' | 'ident' | 'eq' | 'newline' | 'eof';

export interface MiniToken {
  kind: MiniTokenKind;
  text: string;
  value?: number;
  span: Span;
}

export type MiniTokenizeResult = Result<{ tokens: MiniToken[] }>;

export function tokenizeMini(source: string): MiniTokenizeResult {
  const tokens: MiniToken[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i]!;

    if (ch === ' ' || ch === '\t' || ch === '　' || ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      const start = i++;
      if (tokens.at(-1)?.kind !== 'newline') {
        tokens.push({ kind: 'newline', text: '\n', span: { start, end: i } });
      }
      continue;
    }
    if (ch === '#' || ch === '※') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const start = i;
      let raw = '';
      while (i < source.length && /[0-9.]/.test(source[i]!)) raw += source[i++];
      const value = Number(raw);
      if (Number.isNaN(value)) return err(`「${raw}」を数として読めませんでした。`, { start, end: i });
      tokens.push({ kind: 'number', text: raw, value, span: { start, end: i } });
      continue;
    }
    if ('+-*/×÷'.includes(ch)) {
      const start = i++;
      const text = ch === '×' ? '*' : ch === '÷' ? '/' : ch;
      tokens.push({ kind: 'op', text, span: { start, end: i } });
      continue;
    }
    if (ch === '(' || ch === '（') {
      const start = i++;
      tokens.push({ kind: 'lparen', text: '(', span: { start, end: i } });
      continue;
    }
    if (ch === ')' || ch === '）') {
      const start = i++;
      tokens.push({ kind: 'rparen', text: ')', span: { start, end: i } });
      continue;
    }
    if (ch === '=') {
      const start = i++;
      tokens.push({ kind: 'eq', text: '=', span: { start, end: i } });
      continue;
    }
    if (/[\p{L}_]/u.test(ch)) {
      const start = i;
      let text = '';
      while (i < source.length && /[\p{L}\p{N}_]/u.test(source[i]!)) text += source[i++];
      tokens.push({ kind: 'ident', text, span: { start, end: i } });
      continue;
    }

    return err(`「${ch}」という記号は、この言語にはありません。`, { start: i, end: i + 1 });
  }

  tokens.push({ kind: 'eof', text: '', span: { start: i, end: i } });
  return { ok: true, tokens };
}

/* ---------- AST ---------- */

export type MiniExpr =
  | { type: 'num'; value: number; span: Span }
  | { type: 'var'; name: string; span: Span }
  | { type: 'bin'; op: '+' | '-' | '*' | '/'; left: MiniExpr; right: MiniExpr; span: Span };

export type MiniStmt =
  | { type: 'expr'; expr: MiniExpr; span: Span }
  | { type: 'assign'; name: string; value: MiniExpr; span: Span };

export interface MiniProgram {
  type: 'program';
  body: MiniStmt[];
  span: Span;
}

export type MiniParseResult = Result<{ program: MiniProgram }>;

/* ---------- パーサ（優先順位のぼり法） ---------- */

class MiniParseError extends Error {
  constructor(public niwa: NiwaError) {
    super(niwa.message);
  }
}

function fail(message: string, span: Span, hint?: string): never {
  throw new MiniParseError({ message, span, ...(hint ? { hint } : {}) });
}

class MiniParser {
  private pos = 0;

  constructor(
    private tokens: MiniToken[],
    private features: LanguageFeatures,
  ) {}

  private peek(offset = 0): MiniToken {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]!;
  }

  private next(): MiniToken {
    const t = this.peek();
    if (t.kind !== 'eof') this.pos++;
    return t;
  }

  parseProgram(): MiniProgram {
    const start = this.peek().span.start;
    const body: MiniStmt[] = [];
    while (this.peek().kind === 'newline') this.next();
    while (this.peek().kind !== 'eof') {
      body.push(this.parseStmt());
      if (this.peek().kind !== 'eof' && this.peek().kind !== 'newline') {
        fail(`文の終わりのはずの場所に「${this.peek().text}」が続いています。`, this.peek().span);
      }
      while (this.peek().kind === 'newline') this.next();
    }
    return { type: 'program', body, span: { start, end: this.peek().span.end } };
  }

  private parseStmt(): MiniStmt {
    // 代入: ident = expr
    if (this.peek().kind === 'ident' && this.peek(1).kind === 'eq') {
      const nameTok = this.next();
      if (!this.features.variables) {
        fail(
          'この章では、まだ「変数」は登場していません。',
          nameTok.span,
          '変数は、もうすこし先のレッスンであなたが実装します。',
        );
      }
      this.next(); // =
      const value = this.parseExpr(0);
      return {
        type: 'assign',
        name: nameTok.text,
        value,
        span: { start: nameTok.span.start, end: value.span.end },
      };
    }
    const expr = this.parseExpr(0);
    return { type: 'expr', expr, span: expr.span };
  }

  // minBp方式（Prattパース）。たし算・ひき算は強さ1、かけ算・わり算は強さ2
  private parseExpr(minBp: number): MiniExpr {
    let left = this.parsePrimary();

    for (;;) {
      const t = this.peek();
      if (t.kind !== 'op') break;
      const op = t.text as '+' | '-' | '*' | '/';
      const bp = op === '+' || op === '-' ? 1 : 2;
      if (bp < minBp) break;

      if ((op === '+' || op === '-') && !this.features.add) {
        fail(
          `この章では、まだ「${op}」は登場していません。`,
          t.span,
          'いまの言語が話せるのは、数だけです。',
        );
      }
      if ((op === '*' || op === '/') && !this.features.mul) {
        fail(
          `この章では、まだ「${op === '*' ? '×' : '÷'}」は登場していません。`,
          t.span,
          'かけ算とわり算は、次の章で言語に教えます。',
        );
      }

      this.next();
      const right = this.parseExpr(bp + 1);
      left = { type: 'bin', op, left, right, span: { start: left.span.start, end: right.span.end } };
    }

    return left;
  }

  private parsePrimary(): MiniExpr {
    const t = this.peek();

    if (t.kind === 'number') {
      this.next();
      return { type: 'num', value: t.value!, span: t.span };
    }
    if (t.kind === 'ident') {
      if (!this.features.variables) {
        fail(
          `「${t.text}」——この言語は、まだ名前を知りません。`,
          t.span,
          '変数は、もうすこし先のレッスンであなたが実装します。',
        );
      }
      this.next();
      return { type: 'var', name: t.text, span: t.span };
    }
    if (t.kind === 'lparen') {
      if (!this.features.paren) {
        fail('この章では、まだ「(」は登場していません。', t.span);
      }
      this.next();
      const inner = this.parseExpr(0);
      if (this.peek().kind !== 'rparen') {
        fail('( が ) で閉じられていません。', t.span);
      }
      this.next();
      return inner;
    }
    if (t.kind === 'op' && t.text === '-') {
      this.next();
      const operand = this.parsePrimary();
      return {
        type: 'bin',
        op: '-',
        left: { type: 'num', value: 0, span: t.span },
        right: operand,
        span: { start: t.span.start, end: operand.span.end },
      };
    }

    fail(
      t.kind === 'eof'
        ? '式の途中で、コードが終わってしまいました。'
        : `ここに「${t.text}」が来る理由が分かりませんでした。`,
      t.span,
      'ここには数が入ります。',
    );
  }
}

export function parseMini(source: string, features: LanguageFeatures): MiniParseResult {
  const tk = tokenizeMini(source);
  if (!tk.ok) return tk;
  try {
    return { ok: true, program: new MiniParser(tk.tokens, features).parseProgram() };
  } catch (e) {
    if (e instanceof MiniParseError) return { ok: false, error: e.niwa };
    throw e;
  }
}

/* ---------- 評価器 ---------- */

export type MiniRunResult = Result<{ values: number[] }>;

function evalExpr(expr: MiniExpr, env: Map<string, number>): number {
  switch (expr.type) {
    case 'num':
      return expr.value;
    case 'var': {
      const v = env.get(expr.name);
      if (v === undefined) {
        throw new MiniParseError({
          message: `「${expr.name}」という名前を、まだ知りません。`,
          span: expr.span,
          hint: `先に「${expr.name} = 値」と書いてください。`,
        });
      }
      return v;
    }
    case 'bin': {
      const l = evalExpr(expr.left, env);
      const r = evalExpr(expr.right, env);
      switch (expr.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          if (r === 0) {
            throw new MiniParseError({
              message: '0では割れませんでした。',
              span: expr.right.span,
            });
          }
          return l / r;
      }
    }
  }
}

export function runMini(source: string, features: LanguageFeatures): MiniRunResult {
  const p = parseMini(source, features);
  if (!p.ok) return p;
  try {
    const env = new Map<string, number>();
    const values: number[] = [];
    for (const stmt of p.program.body) {
      if (stmt.type === 'assign') {
        const v = evalExpr(stmt.value, env);
        env.set(stmt.name, v);
        values.push(v);
      } else {
        values.push(evalExpr(stmt.expr, env));
      }
    }
    return { ok: true, values };
  } catch (e) {
    if (e instanceof MiniParseError) return { ok: false, error: e.niwa };
    throw e;
  }
}
