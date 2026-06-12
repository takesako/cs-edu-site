import type { Value } from './values';

/** 名前 → 値 の対応表。入れ子のスコープを親チェーンでたどる。 */
export class Env {
  private table = new Map<string, Value>();

  constructor(private parent?: Env) {}

  /** 名づけ（とよぶ）。同じスコープでの二重定義は失敗を返す。 */
  define(name: string, value: Value): boolean {
    if (this.table.has(name)) return false;
    this.table.set(name, value);
    return true;
  }

  /** 付け替え（にする）。チェーンをさかのぼって探す。見つからなければ false。 */
  assign(name: string, value: Value): boolean {
    if (this.table.has(name)) {
      this.table.set(name, value);
      return true;
    }
    return this.parent ? this.parent.assign(name, value) : false;
  }

  lookup(name: string): Value | undefined {
    return this.table.get(name) ?? this.parent?.lookup(name);
  }

  child(): Env {
    return new Env(this);
  }
}
