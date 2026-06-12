import type { Span } from './token';

/**
 * にわ語のエラー。コンピュータは「世界一誠実な読み手」なので、
 * エラーは叱責ではなく、困っている場所と理由を正直に伝える返事である。
 */
export interface NiwaError {
  message: string;
  span: Span;
  /** つまずいた人への次の一歩。UIでエラーの下に小さく出す */
  hint?: string;
}

export type Result<T> = { ok: true } & T | { ok: false; error: NiwaError };

export function err(message: string, span: Span, hint?: string): { ok: false; error: NiwaError } {
  return { ok: false, error: { message, span, ...(hint ? { hint } : {}) } };
}
