import type { Span } from './token';

/* ---------- 式 ---------- */

export interface NumLit {
  type: 'num';
  value: number;
  span: Span;
}

export interface StrLit {
  type: 'str';
  value: string;
  span: Span;
}

export interface Ident {
  type: 'ident';
  name: string;
  span: Span;
}

export interface BinOp {
  type: 'binop';
  op: '+' | '-' | '*' | '/';
  left: Expr;
  right: Expr;
  span: Span;
}

/** くらべる：「Aが B より おおきい/ちいさい」「Aが B と おなじ」 */
export interface Compare {
  type: 'compare';
  op: 'gt' | 'lt' | 'eq';
  left: Expr;
  right: Expr;
  span: Span;
}

export type Expr = NumLit | StrLit | Ident | BinOp | Compare;

/* ---------- 文 ---------- */

/** 「<形/ことば> を かく」 */
export interface Draw {
  type: 'draw';
  shape: Expr;
  span: Span;
}

/** 「<値> と いう」 テキスト出力 */
export interface Say {
  type: 'say';
  value: Expr;
  span: Span;
}

/** 「<距離> すすむ」 */
export interface Move {
  type: 'move';
  distance: Expr;
  span: Span;
}

/** 「みぎ/ひだり へ <角度> まわる」 */
export interface Turn {
  type: 'turn';
  direction: 'right' | 'left';
  angle: Expr;
  span: Span;
}

/** 「<値> を <名前> とよぶ」 名づけ（宣言） */
export interface NameDecl {
  type: 'name';
  value: Expr;
  name: string;
  span: Span;
}

/** 「<名前> を <値> にする」 名前の付け替え（再代入） */
export interface Assign {
  type: 'assign';
  name: string;
  nameSpan: Span;
  value: Expr;
  span: Span;
}

/** 「<回数> かい くりかえす { … }」 */
export interface Repeat {
  type: 'repeat';
  count: Expr;
  body: Stmt[];
  span: Span;
}

/** 「もし <条件> ならば { … } ちがえば { … }」 */
export interface If {
  type: 'if';
  cond: Expr;
  then: Stmt[];
  else?: Stmt[];
  span: Span;
}

/** 「<名前> とは { … }」 ことばの定義 */
export interface DefWord {
  type: 'def';
  name: string;
  body: Stmt[];
  span: Span;
}

/** 定義したことばを呼ぶ（文として名前だけ書く） */
export interface CallWord {
  type: 'call';
  name: string;
  span: Span;
}

export type Stmt = Draw | Say | Move | Turn | NameDecl | Assign | Repeat | If | DefWord | CallWord;

export interface Program {
  type: 'program';
  body: Stmt[];
  span: Span;
}
