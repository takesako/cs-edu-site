import { useMemo, useState } from 'preact/hooks';
import {
  compileRegex,
  findMatches,
  matchesWhole,
  traceMatch,
  type MatchSpan,
} from '../../engine/regex';
import NfaDiagram from './NfaDiagram';

interface Props {
  initialPattern: string;
  initialText: string;
  /** 行ごとに「もよう全体に当てはまるか」を ○× で見せる（書式チェックのレッスン用） */
  checkLines?: boolean;
  /** 状態機械の図を見せる */
  showNfa?: boolean;
  /** 1文字ずつ読む様子を見せる（レッスン6用。showNfaも自動で有効） */
  stepMode?: boolean;
}

/** マッチ範囲で本文を塗り分ける */
function Highlighted({ text, matches }: { text: string; matches: MatchSpan[] }) {
  const segments: { text: string; hit: boolean }[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) segments.push({ text: text.slice(cursor, m.start), hit: false });
    segments.push({ text: text.slice(m.start, m.end), hit: true });
    cursor = m.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), hit: false });
  return (
    <pre class="regexlab-text">
      {segments.map((s, i) => (s.hit ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}
    </pre>
  );
}

/**
 * コース3の実験室。もよう（パターン）と本文を並べて、
 * 当てはまった場所がその場で塗られる。
 */
export default function RegexLab({
  initialPattern,
  initialText,
  checkLines = false,
  showNfa = false,
  stepMode = false,
}: Props) {
  const [pattern, setPattern] = useState(initialPattern);
  const [text, setText] = useState(initialText);
  const [stepIndex, setStepIndex] = useState(0);

  const compiled = useMemo(() => compileRegex(pattern), [pattern]);

  const matches = useMemo(
    () => (compiled.ok && !checkLines && !stepMode ? findMatches(compiled.nfa, text) : []),
    [compiled, text, checkLines, stepMode],
  );

  const lineResults = useMemo(() => {
    if (!compiled.ok || !checkLines) return [];
    return text.split('\n').map((line) => ({ line, ok: matchesWhole(compiled.nfa, line) }));
  }, [compiled, text, checkLines]);

  const trace = useMemo(() => {
    if (!compiled.ok || !stepMode) return [];
    return traceMatch(compiled.nfa, text);
  }, [compiled, text, stepMode]);

  const step = trace.length > 0 ? trace[Math.min(stepIndex, trace.length - 1)] : undefined;
  const textChars = useMemo(() => [...text], [text]);

  return (
    <div class="astviewer regexlab">
      <div class="regexlab-inputs">
        <label class="regexlab-pattern">
          <span class="astviewer-label">もよう（パターン）</span>
          <input
            type="text"
            value={pattern}
            spellcheck={false}
            autocapitalize="off"
            autocorrect="off"
            onInput={(e) => {
              setPattern((e.target as HTMLInputElement).value);
              setStepIndex(0);
            }}
          />
        </label>
        <label>
          <span class="astviewer-label">{stepMode ? '読ませる文字の列' : 'さがされる本文'}</span>
          <textarea
            value={text}
            rows={stepMode ? 1 : Math.min(8, Math.max(2, text.split('\n').length))}
            spellcheck={false}
            onInput={(e) => {
              setText((e.target as HTMLTextAreaElement).value);
              setStepIndex(0);
            }}
          />
        </label>
      </div>

      {!compiled.ok && (
        <p class="minilab-error">
          {compiled.error.message}
          {compiled.error.hint && <span class="minilab-hint">{compiled.error.hint}</span>}
        </p>
      )}

      {compiled.ok && !checkLines && !stepMode && (
        <div>
          <span class="astviewer-label">
            {matches.length > 0 ? `当てはまった場所 — ${matches.length}か所` : '当てはまる場所は、まだありません'}
          </span>
          <Highlighted text={text} matches={matches} />
        </div>
      )}

      {compiled.ok && checkLines && (
        <div>
          <span class="astviewer-label">行ごとの判定（行ぜんぶが、もように当てはまるか）</span>
          <ul class="regexlab-lines">
            {lineResults.map((r, i) => (
              <li key={i} class={r.ok ? 'is-ok' : 'is-ng'}>
                <span class="regexlab-mark">{r.ok ? '○' : '×'}</span>
                <code>{r.line === '' ? '（空の行）' : r.line}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {compiled.ok && stepMode && step && (
        <div class="regexlab-step">
          <span class="astviewer-label">機械に1文字ずつ読ませる</span>
          <p class="regexlab-tape">
            {textChars.map((ch, i) => (
              <span key={i} class={i < step.consumed ? 'is-read' : ''}>
                {ch}
              </span>
            ))}
          </p>
          <div class="regexlab-controls">
            <button
              type="button"
              class="btn btn-ghost"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex(stepIndex - 1)}
            >
              1文字もどる
            </button>
            <button
              type="button"
              class="btn btn-primary"
              disabled={stepIndex >= trace.length - 1}
              onClick={() => setStepIndex(stepIndex + 1)}
            >
              1文字すすむ
            </button>
            <button type="button" class="btn btn-ghost" onClick={() => setStepIndex(0)}>
              はじめから
            </button>
          </div>
          <p class="regexlab-status">
            {step.active.length === 0
              ? 'どの道も行き止まりになりました。この先は、もう当てはまりません。'
              : `いま ${step.active.length} 個の状態に、同時に立っています${step.accepted ? '——そのひとつは受理状態です。' : '。'}`}
          </p>
        </div>
      )}

      {compiled.ok && (showNfa || stepMode) && (
        <div>
          <span class="astviewer-label">この、もようの機械（二重丸が受理状態）</span>
          <NfaDiagram nfa={compiled.nfa} active={stepMode ? step?.active : undefined} />
        </div>
      )}
    </div>
  );
}
