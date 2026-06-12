import type { Expr, Program, Stmt } from './ast';
import { COLOR_WORDS, INK } from './colors';
import { Env } from './env';
import type { NiwaError } from './errors';
import type { Span } from './token';
import { bool, kindName, num, show, str, type Value } from './values';

/* ---------- 描画コマンド ---------- */

export interface Point {
  x: number;
  y: number;
}

export type DrawCommand =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { kind: 'circle'; x: number; y: number; r: number; color: string; width: number }
  | { kind: 'polygon'; points: Point[]; color: string; width: number };

export interface RunOutput {
  drawing: DrawCommand[];
  output: string[];
}

/* ---------- 内部状態 ---------- */

const MAX_FUEL = 100_000;
const MAX_DEPTH = 200;
const MAX_COMMANDS = 20_000;

class EvalError extends Error {
  constructor(public niwa: NiwaError) {
    super(niwa.message);
  }
}

function fail(message: string, span: Span, hint?: string): never {
  throw new EvalError({ message, span, ...(hint ? { hint } : {}) });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

class Interpreter {
  private fuel = MAX_FUEL;
  private depth = 0;
  private drawing: DrawCommand[] = [];
  private output: string[] = [];

  // タートル：中央(0,0)から、上(-90°)を向いて始まる
  private x = 0;
  private y = 0;
  private heading = -90;

  private global = new Env();

  constructor() {
    for (const [word, hex] of Object.entries(COLOR_WORDS)) {
      this.global.define(word, { type: 'color', value: hex });
    }
    this.global.define('まる', { type: 'shape', kind: 'circle' });
    this.global.define('さんかく', { type: 'shape', kind: 'triangle' });
    this.global.define('しかく', { type: 'shape', kind: 'square' });
    this.global.define('ほし', { type: 'shape', kind: 'star' });
    this.global.define('いろ', { type: 'color', value: INK });
    this.global.define('ふとさ', num(3));
    this.global.define('おおきさ', num(80));
  }

  run(program: Program): RunOutput {
    this.execBlock(program.body, this.global);
    return { drawing: this.drawing, output: this.output };
  }

  /* ---------- 文 ---------- */

  private execBlock(body: Stmt[], env: Env): void {
    for (const stmt of body) this.execStmt(stmt, env);
  }

  private execStmt(stmt: Stmt, env: Env): void {
    this.burn(stmt.span);

    switch (stmt.type) {
      case 'draw': {
        const v = this.evalExpr(stmt.shape, env);
        if (v.type === 'shape') {
          this.emitShape(v.kind, env, stmt.span);
        } else if (v.type === 'routine') {
          this.callRoutine(v, stmt.span);
        } else {
          fail(
            `${show(v)} は形ではないので、かけませんでした。`,
            stmt.shape.span,
            'かけるのは：まる さんかく しかく ほし、または自分で定義したことばです。',
          );
        }
        return;
      }

      case 'say': {
        const v = this.evalExpr(stmt.value, env);
        this.output.push(show(v));
        if (this.output.length > 1000) {
          fail('いうことが多すぎて、聞ききれませんでした。', stmt.span, '出力は1000行までです。');
        }
        return;
      }

      case 'move': {
        const d = this.expectNumber(this.evalExpr(stmt.distance, env), stmt.distance.span, '進む距離');
        const rad = (this.heading * Math.PI) / 180;
        const nx = this.x + d * Math.cos(rad);
        const ny = this.y + d * Math.sin(rad);
        this.emit({
          kind: 'line',
          x1: round2(this.x),
          y1: round2(this.y),
          x2: round2(nx),
          y2: round2(ny),
          color: this.currentColor(),
          width: this.currentWidth(),
        }, stmt.span);
        this.x = nx;
        this.y = ny;
        return;
      }

      case 'turn': {
        const a = this.expectNumber(this.evalExpr(stmt.angle, env), stmt.angle.span, '角度');
        this.heading += stmt.direction === 'right' ? a : -a;
        return;
      }

      case 'name': {
        const v = this.evalExpr(stmt.value, env);
        if (!env.define(stmt.name, v)) {
          fail(
            `「${stmt.name}」という名前は、すでに使われています。`,
            stmt.span,
            `名前を付け替えるなら「${stmt.name} を 〜 にする」と書きます。`,
          );
        }
        return;
      }

      case 'assign': {
        const v = this.evalExpr(stmt.value, env);
        if (stmt.name === 'いろ' && v.type !== 'color') {
          fail(
            `いろ にできるのは色だけです（${show(v)} は${kindName(v)}でした）。`,
            stmt.value.span,
            '色のことば：あか だいだい き みどり そら あお むらさき もも ちゃ くろ しろ はい',
          );
        }
        if ((stmt.name === 'ふとさ' || stmt.name === 'おおきさ') && v.type !== 'number') {
          fail(`${stmt.name} にできるのは数だけです。`, stmt.value.span);
        }
        if (!env.assign(stmt.name, v)) {
          fail(
            `「${stmt.name}」という名前を、まだ知りません。`,
            stmt.nameSpan,
            `先に「〜 を ${stmt.name} とよぶ」で名づけてください。`,
          );
        }
        return;
      }

      case 'repeat': {
        const v = this.evalExpr(stmt.count, env);
        const n = this.expectNumber(v, stmt.count.span, 'くりかえす回数');
        if (n < 0 || !Number.isInteger(n)) {
          fail(`くりかえす回数は 0以上の整数です（${show(v)} と言われました）。`, stmt.count.span);
        }
        for (let i = 0; i < n; i++) {
          this.execBlock(stmt.body, env);
        }
        return;
      }

      case 'if': {
        const c = this.evalExpr(stmt.cond, env);
        if (c.type !== 'boolean') {
          fail(
            `「もし」の条件は、ほんとうかうそかで答えられる文にしてください。`,
            stmt.cond.span,
            '例：x が 3 より おおきい ／ x が 3 と おなじ',
          );
        }
        if (c.value) this.execBlock(stmt.then, env);
        else if (stmt.else) this.execBlock(stmt.else, env);
        return;
      }

      case 'def': {
        if (!env.define(stmt.name, { type: 'routine', name: stmt.name, body: stmt.body })) {
          fail(`「${stmt.name}」という名前は、すでに使われています。`, stmt.span);
        }
        return;
      }

      case 'call': {
        const v = env.lookup(stmt.name);
        if (!v) {
          fail(
            `「${stmt.name}」ということばを、まだ知りません。`,
            stmt.span,
            `「${stmt.name} とは { … }」で定義すると、使えるようになります。`,
          );
        }
        if (v.type === 'routine') {
          this.callRoutine(v, stmt.span);
          return;
        }
        if (v.type === 'shape') {
          fail(`形は「${stmt.name} を かく」のように使います。`, stmt.span);
        }
        fail(`「${stmt.name}」は${kindName(v)}なので、それだけでは文になりません。`, stmt.span);
      }
    }
  }

  private callRoutine(v: Value & { type: 'routine' }, span: Span): void {
    this.depth++;
    if (this.depth > MAX_DEPTH) {
      fail(
        `ことばが ことばを呼びすぎて、終わらなくなりました。`,
        span,
        `「${v.name}」が自分自身を呼んでいないか、確かめてください。`,
      );
    }
    this.execBlock(v.body, this.global.child());
    this.depth--;
  }

  /* ---------- 式 ---------- */

  private evalExpr(expr: Expr, env: Env): Value {
    this.burn(expr.span);

    switch (expr.type) {
      case 'num':
        return num(expr.value);
      case 'str':
        return str(expr.value);

      case 'ident': {
        const v = env.lookup(expr.name);
        if (!v) {
          fail(
            `「${expr.name}」ということばを、まだ知りません。`,
            expr.span,
            `「〜 を ${expr.name} とよぶ」で名づけるか、書きまちがいがないか確かめてください。`,
          );
        }
        return v;
      }

      case 'binop': {
        const l = this.evalExpr(expr.left, env);
        const r = this.evalExpr(expr.right, env);

        if (expr.op === '+') {
          if (l.type === 'number' && r.type === 'number') return num(l.value + r.value);
          if (l.type === 'string' || r.type === 'string') return str(show(l) + show(r));
          fail(
            `${kindName(l)}と${kindName(r)}は、足せませんでした。`,
            expr.span,
            '足せるのは：数どうし、または文字列をつなげるときです。',
          );
        }

        const ln = this.expectNumber(l, expr.left.span, '計算');
        const rn = this.expectNumber(r, expr.right.span, '計算');
        if (expr.op === '-') return num(ln - rn);
        if (expr.op === '*') return num(ln * rn);
        if (rn === 0) {
          fail('0では割れませんでした。', expr.right.span, 'この世のどんな計算機も、0では割れません。');
        }
        return num(ln / rn);
      }

      case 'compare': {
        const l = this.evalExpr(expr.left, env);
        const r = this.evalExpr(expr.right, env);
        if (expr.op === 'eq') {
          if (l.type === 'number' && r.type === 'number') return bool(l.value === r.value);
          if (l.type === 'string' && r.type === 'string') return bool(l.value === r.value);
          return bool(false);
        }
        const ln = this.expectNumber(l, expr.left.span, 'くらべる');
        const rn = this.expectNumber(r, expr.right.span, 'くらべる');
        return bool(expr.op === 'gt' ? ln > rn : ln < rn);
      }
    }
  }

  /* ---------- 描画 ---------- */

  private currentColor(): string {
    const v = this.global.lookup('いろ');
    return v?.type === 'color' ? v.value : INK;
  }

  private currentWidth(): number {
    const v = this.global.lookup('ふとさ');
    return v?.type === 'number' ? v.value : 3;
  }

  private currentSize(): number {
    const v = this.global.lookup('おおきさ');
    return v?.type === 'number' ? v.value : 80;
  }

  private emitShape(kind: 'circle' | 'triangle' | 'square' | 'star', _env: Env, span: Span): void {
    const size = this.currentSize();
    const color = this.currentColor();
    const width = this.currentWidth();

    if (kind === 'circle') {
      this.emit(
        { kind: 'circle', x: round2(this.x), y: round2(this.y), r: round2(size / 2), color, width },
        span,
      );
      return;
    }

    const points: Point[] = [];
    const push = (angleDeg: number, radius: number) => {
      const rad = (angleDeg * Math.PI) / 180;
      points.push({
        x: round2(this.x + radius * Math.cos(rad)),
        y: round2(this.y + radius * Math.sin(rad)),
      });
    };

    if (kind === 'triangle') {
      const r = size / 2;
      for (let i = 0; i < 3; i++) push(this.heading + i * 120, r);
    } else if (kind === 'square') {
      for (let i = 0; i < 4; i++) push(this.heading + 45 + i * 90, size / 2);
    } else {
      // star
      const outer = size / 2;
      const inner = outer * 0.4;
      for (let i = 0; i < 10; i++) {
        push(this.heading + i * 36, i % 2 === 0 ? outer : inner);
      }
    }

    this.emit({ kind: 'polygon', points, color, width }, span);
  }

  private emit(cmd: DrawCommand, span: Span): void {
    this.drawing.push(cmd);
    if (this.drawing.length > MAX_COMMANDS) {
      fail(
        '絵が多すぎて、かききれませんでした。',
        span,
        `一度にかけるのは ${MAX_COMMANDS} 筆までです。くりかえしの回数を見直してみてください。`,
      );
    }
  }

  /* ---------- 安全装置 ---------- */

  private burn(span: Span): void {
    this.fuel--;
    if (this.fuel <= 0) {
      fail(
        'プログラムがいつまでも とまりませんでした。',
        span,
        'くりかえしや、ことばの呼び合いが、終わらない形になっていないか確かめてください。',
      );
    }
  }

  private expectNumber(v: Value, span: Span, what: string): number {
    if (v.type !== 'number') {
      fail(`${what}には数を使います（${show(v)} は${kindName(v)}でした）。`, span);
    }
    return v.value;
  }
}

export type EvalResult =
  | ({ ok: true } & RunOutput)
  | { ok: false; error: NiwaError };

export function evaluate(program: Program): EvalResult {
  try {
    const out = new Interpreter().run(program);
    return { ok: true, ...out };
  } catch (e) {
    if (e instanceof EvalError) return { ok: false, error: e.niwa };
    throw e;
  }
}
