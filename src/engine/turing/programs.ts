import { BLANK, type Machine } from './machine';

/** 教材機械。状態名は日本語——にわ語と同じ思想 */
export interface Program {
  name: string;
  description: string;
  machine: Machine;
  /** 実験室の初期テープ */
  sampleInput: string;
}

/** 0と1をぜんぶ裏返す。いちばん小さな「読む・書く・進む」 */
export const FLIP: Program = {
  name: 'うらがえす',
  description: '0は1に、1は0に書きかえながら、右へ進む。空白に出会ったら止まる。',
  sampleInput: '0110',
  machine: {
    start: 'すすむ',
    halt: 'おわり',
    rules: [
      { state: 'すすむ', read: '0', write: '1', move: 'R', next: 'すすむ' },
      { state: 'すすむ', read: '1', write: '0', move: 'R', next: 'すすむ' },
      { state: 'すすむ', read: BLANK, write: BLANK, move: 'N', next: 'おわり' },
    ],
  },
};

/** 2進法の数に1を足す。くりあがりの連鎖が見どころ */
export const INCREMENT: Program = {
  name: '1をたす',
  description: '2進法の数の右端まで歩き、1を足す。1が続くかぎり、くりあがる。',
  sampleInput: '1011',
  machine: {
    start: 'みぎへ',
    halt: 'おわり',
    rules: [
      { state: 'みぎへ', read: '0', write: '0', move: 'R', next: 'みぎへ' },
      { state: 'みぎへ', read: '1', write: '1', move: 'R', next: 'みぎへ' },
      { state: 'みぎへ', read: BLANK, write: BLANK, move: 'L', next: 'くりあげ' },
      { state: 'くりあげ', read: '0', write: '1', move: 'N', next: 'おわり' },
      { state: 'くりあげ', read: '1', write: '0', move: 'L', next: 'くりあげ' },
      { state: 'くりあげ', read: BLANK, write: '1', move: 'N', next: 'おわり' },
    ],
  },
};

/** 棒の数のたし算：「111+11」→「11111」 */
export const ADD: Program = {
  name: 'たしざん',
  description: '棒の数どうしのたし算。+を棒にすりかえて、最後の1本を消す。',
  sampleInput: '111+11',
  machine: {
    start: 'すすむ',
    halt: 'おわり',
    rules: [
      { state: 'すすむ', read: '1', write: '1', move: 'R', next: 'すすむ' },
      { state: 'すすむ', read: '+', write: '1', move: 'R', next: 'すすむ' },
      { state: 'すすむ', read: BLANK, write: BLANK, move: 'L', next: 'けす' },
      { state: 'けす', read: '1', write: BLANK, move: 'N', next: 'おわり' },
    ],
  },
};

/** 止まらない機械。左右にゆれ続ける */
export const FOREVER: Program = {
  name: 'とまらない',
  description: '右へ1歩、左へ1歩。永遠にゆれ続けて、halt にたどり着かない。',
  sampleInput: '',
  machine: {
    start: 'みぎ',
    halt: 'おわり',
    rules: [
      { state: 'みぎ', read: BLANK, write: BLANK, move: 'R', next: 'ひだり' },
      { state: 'ひだり', read: BLANK, write: BLANK, move: 'L', next: 'みぎ' },
    ],
  },
};

export const PROGRAMS = {
  flip: FLIP,
  increment: INCREMENT,
  add: ADD,
  forever: FOREVER,
} as const;

export type ProgramKey = keyof typeof PROGRAMS;
