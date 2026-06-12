import type { ClassItem, RegexNode, Span } from './ast';
import { err, type Result } from './errors';

export type ParseResult = Result<{ node: RegexNode }>;

/**
 * 正規表現パターンを構文木に読む。
 * 文法: alt → concat → repeat → atom の再帰下降。
 * 文字はコードポイント単位で扱う（絵文字も1文字）。Spanは UTF-16 単位。
 */
export function parseRegex(pattern: string): ParseResult {
  const p = new Parser(pattern);
  const result = p.parseAlt();
  if (!result.ok) return result;
  if (!p.atEnd()) {
    const span = p.spanHere();
    if (p.peek() === ')') {
      return err('閉じる「)」がありますが、開く「(」が見つかりません。', span, '「(」を前のどこかに足すか、この「)」を消してみてください。');
    }
    return err(`ここから先（「${p.peek()}」）が読めませんでした。`, span);
  }
  return { ok: true, node: result.node };
}

class Parser {
  /** コードポイント単位の文字列。各要素は {ch, at} で at はUTF-16位置 */
  private chars: { ch: string; at: number }[] = [];
  private pos = 0;
  private sourceLength: number;

  constructor(source: string) {
    let at = 0;
    for (const ch of source) {
      this.chars.push({ ch, at });
      at += ch.length;
    }
    this.sourceLength = source.length;
  }

  atEnd(): boolean {
    return this.pos >= this.chars.length;
  }

  peek(): string | undefined {
    return this.chars[this.pos]?.ch;
  }

  /** いまの読み位置のSpan（終端なら最後の1文字分） */
  spanHere(): Span {
    const c = this.chars[this.pos];
    if (!c) return { start: Math.max(0, this.sourceLength - 1), end: this.sourceLength };
    return { start: c.at, end: c.at + c.ch.length };
  }

  private startAt(): number {
    return this.chars[this.pos]?.at ?? this.sourceLength;
  }

  private endAt(): number {
    const prev = this.chars[this.pos - 1];
    return prev ? prev.at + prev.ch.length : 0;
  }

  private next(): string {
    return this.chars[this.pos++]!.ch;
  }

  /** alt := concat ('|' concat)* */
  parseAlt(): Result<{ node: RegexNode }> {
    const start = this.startAt();
    const first = this.parseConcat();
    if (!first.ok) return first;
    const options = [first.node];
    while (this.peek() === '|') {
      this.next();
      const rest = this.parseConcat();
      if (!rest.ok) return rest;
      options.push(rest.node);
    }
    if (options.length === 1) return { ok: true, node: options[0] };
    return { ok: true, node: { kind: 'alt', options, span: { start, end: this.endAt() } } };
  }

  /** concat := repeat* （`|` `)` か終端まで） */
  private parseConcat(): Result<{ node: RegexNode }> {
    const start = this.startAt();
    const parts: RegexNode[] = [];
    while (!this.atEnd() && this.peek() !== '|' && this.peek() !== ')') {
      const item = this.parseRepeat();
      if (!item.ok) return item;
      parts.push(item.node);
    }
    if (parts.length === 1) return { ok: true, node: parts[0] };
    return {
      ok: true,
      node: { kind: 'concat', parts, span: { start, end: Math.max(start, this.endAt()) } },
    };
  }

  /** repeat := atom ('*' | '+' | '?')* */
  private parseRepeat(): Result<{ node: RegexNode }> {
    const start = this.startAt();
    const atom = this.parseAtom();
    if (!atom.ok) return atom;
    let node = atom.node;
    while (this.peek() === '*' || this.peek() === '+' || this.peek() === '?') {
      const op = this.next() as '*' | '+' | '?';
      if (node.kind === 'anchor') {
        return err(
          `「${node.at === 'start' ? '^' : '$'}」に「${op}」はつけられません。`,
          { start, end: this.endAt() },
          '「^」と「$」は文字ではなく「位置」を指すしるしなので、くりかえせません。',
        );
      }
      node = { kind: 'repeat', op, child: node, span: { start, end: this.endAt() } };
    }
    return { ok: true, node };
  }

  private parseAtom(): Result<{ node: RegexNode }> {
    const span = this.spanHere();
    const ch = this.peek();
    if (ch === undefined) {
      return err('もようが途中で終わっています。', span);
    }
    if (ch === '*' || ch === '+' || ch === '?') {
      this.next();
      return err(
        `「${ch}」の前に、くりかえす相手がいません。`,
        span,
        `「${ch}」は直前の1つをくりかえす記号です。たとえば「あ${ch}」のように、前に文字を置いてください。`,
      );
    }
    if (ch === '(') {
      this.next();
      const inner = this.parseAlt();
      if (!inner.ok) return inner;
      if (this.peek() !== ')') {
        return err('開いた「(」が、閉じられていません。', span, '対応する「)」を足してください。');
      }
      this.next();
      return {
        ok: true,
        node: { kind: 'group', child: inner.node, span: { start: span.start, end: this.endAt() } },
      };
    }
    if (ch === '[') {
      return this.parseClass();
    }
    if (ch === '.') {
      this.next();
      return { ok: true, node: { kind: 'any', span } };
    }
    if (ch === '^') {
      this.next();
      return { ok: true, node: { kind: 'anchor', at: 'start', span } };
    }
    if (ch === '$') {
      this.next();
      return { ok: true, node: { kind: 'anchor', at: 'end', span } };
    }
    if (ch === '\\') {
      this.next();
      const escaped = this.peek();
      if (escaped === undefined) {
        return err(
          '「\\」の後ろに文字がありません。',
          span,
          '「\\」は次の1文字を「記号ではなく、ただの文字」として扱うしるしです。',
        );
      }
      this.next();
      return {
        ok: true,
        node: { kind: 'char', ch: escaped, span: { start: span.start, end: this.endAt() } },
      };
    }
    this.next();
    return { ok: true, node: { kind: 'char', ch, span } };
  }

  /** class := '[' '^'? (item)+ ']' */
  private parseClass(): Result<{ node: RegexNode }> {
    const open = this.spanHere();
    this.next(); // [
    let negated = false;
    if (this.peek() === '^') {
      this.next();
      negated = true;
    }
    const items: ClassItem[] = [];
    while (!this.atEnd() && this.peek() !== ']') {
      let ch = this.next();
      if (ch === '\\') {
        const escaped = this.peek();
        if (escaped === undefined) break;
        this.next();
        ch = escaped;
      }
      // 範囲 a-z（「-」が末尾なら、ただの文字）
      if (this.peek() === '-' && this.chars[this.pos + 1] && this.chars[this.pos + 1]!.ch !== ']') {
        this.next(); // -
        let to = this.next();
        if (to === '\\' && !this.atEnd()) {
          to = this.next();
        }
        if (ch.codePointAt(0)! > to.codePointAt(0)!) {
          return err(
            `「${ch}-${to}」は、範囲が逆さまです。`,
            { start: open.start, end: this.endAt() },
            `範囲は小さいほうから書きます。「${to}-${ch}」なら読めます。`,
          );
        }
        items.push({ type: 'range', from: ch, to });
      } else {
        items.push({ type: 'ch', ch });
      }
    }
    if (this.peek() !== ']') {
      return err('開いた「[」が、閉じられていません。', open, '対応する「]」を足してください。');
    }
    this.next(); // ]
    if (items.length === 0) {
      return err(
        '「[ ]」の中が、からっぽです。',
        { start: open.start, end: this.endAt() },
        '「[あいう]」のように、当てはまってよい文字を中に並べます。',
      );
    }
    return {
      ok: true,
      node: { kind: 'class', negated, items, span: { start: open.start, end: this.endAt() } },
    };
  }
}
