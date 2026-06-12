/**
 * turing — コース5「計算できる、とはどういうことか」の教材エンジン。
 * 紙テープと、遷移表と、いまの状態。それだけの機械。
 */

/** 空白の記号。テープの「まだ何も書いていないマス」 */
export const BLANK = '＿';

/** 遷移表の1行：「この状態で、この記号を読んだら——書いて、動いて、移る」 */
export interface Rule {
  state: string;
  read: string;
  write: string;
  move: 'L' | 'R' | 'N';
  next: string;
}

export interface Machine {
  rules: Rule[];
  start: string;
  /** この状態に入ったら、機械は止まる */
  halt: string;
}

/** 1場面：テープの中身・ヘッド位置・状態。可視化のための記録 */
export interface TuringFrame {
  /** 位置→記号（空白は持たない） */
  tape: Record<number, string>;
  head: number;
  state: string;
  /** ここまでの歩数 */
  steps: number;
  /** この場面に来るとき使った規則（最初の場面にはない） */
  applied?: Rule;
  /** 止まったか */
  halted: boolean;
  /** 規則が見つからず手詰まりになったか */
  stuck: boolean;
}

export interface RunResult {
  frames: TuringFrame[];
  /** 止まったか（fuel切れなら false） */
  halted: boolean;
  /** 手詰まり（表に規則がない）で終わったか */
  stuck: boolean;
  steps: number;
  /** 最終テープの文字列（左端の記号から右端まで、空白は＿） */
  finalTape: string;
}

function snapshot(tape: Map<number, string>): Record<number, string> {
  const o: Record<number, string> = {};
  for (const [k, v] of tape) o[k] = v;
  return o;
}

export function findRule(machine: Machine, state: string, read: string): Rule | undefined {
  return machine.rules.find((r) => r.state === state && r.read === read);
}

/** テープを文字列にする（見えている範囲だけ） */
export function tapeToString(tape: Record<number, string>): string {
  const keys = Object.keys(tape).map(Number);
  if (keys.length === 0) return '';
  const lo = Math.min(...keys);
  const hi = Math.max(...keys);
  let s = '';
  for (let i = lo; i <= hi; i++) s += tape[i] ?? BLANK;
  return s;
}

/**
 * 入力をテープに置いて、止まるか fuel が切れるまで動かす。
 * frames には最初の場面から1歩ごとの場面が入る。
 */
export function runMachine(machine: Machine, input: string, fuel = 1000): RunResult {
  const tape = new Map<number, string>();
  [...input].forEach((ch, i) => {
    if (ch !== BLANK) tape.set(i, ch);
  });
  let head = 0;
  let state = machine.start;
  let steps = 0;
  const frames: TuringFrame[] = [
    { tape: snapshot(tape), head, state, steps, halted: state === machine.halt, stuck: false },
  ];

  while (state !== machine.halt && steps < fuel) {
    const read = tape.get(head) ?? BLANK;
    const rule = findRule(machine, state, read);
    if (!rule) {
      frames[frames.length - 1] = { ...frames[frames.length - 1], stuck: true };
      return {
        frames,
        halted: false,
        stuck: true,
        steps,
        finalTape: tapeToString(snapshot(tape)),
      };
    }
    if (rule.write === BLANK) tape.delete(head);
    else tape.set(head, rule.write);
    if (rule.move === 'L') head -= 1;
    else if (rule.move === 'R') head += 1;
    state = rule.next;
    steps += 1;
    frames.push({
      tape: snapshot(tape),
      head,
      state,
      steps,
      applied: rule,
      halted: state === machine.halt,
      stuck: false,
    });
  }

  return {
    frames,
    halted: state === machine.halt,
    stuck: false,
    steps,
    finalTape: tapeToString(snapshot(tape)),
  };
}
