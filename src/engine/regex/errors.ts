import type { Span } from './ast';

/** 正規表現のエラー。場所と理由と、次の一歩を正直に伝える */
export interface RegexError {
  message: string;
  span: Span;
  hint?: string;
}

export type Result<T> = ({ ok: true } & T) | { ok: false; error: RegexError };

export function err(
  message: string,
  span: Span,
  hint?: string,
): { ok: false; error: RegexError } {
  return { ok: false, error: { message, span, ...(hint ? { hint } : {}) } };
}
