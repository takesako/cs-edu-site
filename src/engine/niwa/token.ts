/** ソースコード上の位置範囲（エラー表示・ハイライトに使う） */
export interface Span {
  start: number;
  end: number;
}

export type TokenKind =
  | 'number'
  | 'string'
  | 'word' // 識別子（変数名・色名・形の名前・動詞など）
  | 'particle' // を へ と が より は
  | 'keyword' // かく いう すすむ まわる かい くりかえす もし ならば ちがえば とよぶ にする とは おなじ おおきい ちいさい
  | 'lbrace'
  | 'rbrace'
  | 'lparen'
  | 'rparen'
  | 'op' // + - × ÷ * /
  | 'newline' // 文の区切り（改行・。）
  | 'eof';

export interface Token {
  kind: TokenKind;
  text: string;
  value?: number; // number のとき
  span: Span;
}

export const PARTICLES = new Set(['を', 'へ', 'と', 'が', 'より']);

export const KEYWORDS = new Set([
  'かく',
  'いう',
  'すすむ',
  'まわる',
  'かい',
  'くりかえす',
  'もし',
  'ならば',
  'ちがえば',
  'とよぶ',
  'にする',
  'とは',
  'おなじ',
  'おおきい',
  'ちいさい',
]);
