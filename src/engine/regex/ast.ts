/** パターン文字列の中の位置（UTF-16単位、エディタのハイライトにそのまま使う） */
export interface Span {
  start: number;
  end: number;
}

/** 文字クラス `[...]` の中身ひとつ分 */
export type ClassItem = { type: 'ch'; ch: string } | { type: 'range'; from: string; to: string };

/**
 * 正規表現の構文木。
 * v1で扱う構文: リテラル・`.`・`[...]`・`*` `+` `?`・`|`・`( )`・`^` `$`・`\`エスケープ。
 * 後方参照は意図的に持たない（「正規」であることがコース5につながる教材）。
 */
export type RegexNode =
  | { kind: 'char'; ch: string; span: Span }
  | { kind: 'any'; span: Span }
  | { kind: 'class'; negated: boolean; items: ClassItem[]; span: Span }
  | { kind: 'concat'; parts: RegexNode[]; span: Span }
  | { kind: 'alt'; options: RegexNode[]; span: Span }
  | { kind: 'repeat'; op: '*' | '+' | '?'; child: RegexNode; span: Span }
  | { kind: 'group'; child: RegexNode; span: Span }
  | { kind: 'anchor'; at: 'start' | 'end'; span: Span };
