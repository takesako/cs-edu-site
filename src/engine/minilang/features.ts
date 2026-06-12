/**
 * minilang（コース2の教材言語）の機能フラグ。
 * レッスンが進むごとに、言語が「育つ」——同じ実装を、段階的に解放する。
 */
export interface LanguageFeatures {
  /** たし算・ひき算（レッスン3で解放） */
  add: boolean;
  /** かけ算・わり算と優先順位（レッスン4で解放） */
  mul: boolean;
  /** かっこ（レッスン4で解放） */
  paren: boolean;
  /** 変数（v1では未使用。レッスン6で解放予定） */
  variables: boolean;
}

/** レッスン2：数しか話せない言語 */
export const STAGE_NUMBER: LanguageFeatures = {
  add: false,
  mul: false,
  paren: false,
  variables: false,
};

/** レッスン3：たし算の木 */
export const STAGE_ADD: LanguageFeatures = { add: true, mul: false, paren: false, variables: false };

/** レッスン4：優先順位とかっこ（電卓の完成） */
export const STAGE_CALC: LanguageFeatures = { add: true, mul: true, paren: true, variables: false };

/** レッスン6以降：変数 */
export const STAGE_VAR: LanguageFeatures = { add: true, mul: true, paren: true, variables: true };

export const STAGES: Record<string, LanguageFeatures> = {
  number: STAGE_NUMBER,
  add: STAGE_ADD,
  calc: STAGE_CALC,
  var: STAGE_VAR,
};
