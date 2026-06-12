import type { Stmt } from './ast';

/** 形の種類（組み込みの語） */
export type ShapeKind = 'circle' | 'triangle' | 'square' | 'star';

export type Value =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'color'; value: string } // hex または 'ink'（テーマ依存の墨色）
  | { type: 'shape'; kind: ShapeKind }
  | { type: 'routine'; name: string; body: Stmt[] };

export function num(value: number): Value {
  return { type: 'number', value };
}

export function str(value: string): Value {
  return { type: 'string', value };
}

export function bool(value: boolean): Value {
  return { type: 'boolean', value };
}

/** 値を人に見せる文字列にする（いう文・エラー文で使用） */
export function show(v: Value): string {
  switch (v.type) {
    case 'number':
      return String(v.value);
    case 'string':
      return v.value;
    case 'boolean':
      return v.value ? 'ほんとう' : 'うそ';
    case 'color':
      return `いろ(${v.value})`;
    case 'shape':
      return { circle: 'まる', triangle: 'さんかく', square: 'しかく', star: 'ほし' }[v.kind];
    case 'routine':
      return `ことば「${v.name}」`;
  }
}

/** 値の種類を日本語で言う（エラーメッセージ用） */
export function kindName(v: Value): string {
  switch (v.type) {
    case 'number':
      return '数';
    case 'string':
      return '文字列';
    case 'boolean':
      return 'ほんとうかうそか';
    case 'color':
      return '色';
    case 'shape':
      return '形';
    case 'routine':
      return 'ことば（手順）';
  }
}
