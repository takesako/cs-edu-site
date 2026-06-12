import { useMemo, useState } from 'preact/hooks';
import type { MiniExpr, MiniProgram, MiniStmt } from '../../engine/minilang';
import { parseMini, runMini, STAGE_CALC, STAGES, tokenizeMini } from '../../engine/minilang';
import type { TreeNode } from './TreeView';
import TreeView from './TreeView';

interface Props {
  initialCode: string;
  /** 言語の成長段階: number | add | calc | var */
  stage: string;
  showTokens?: boolean;
  showTree?: boolean;
}

const OP_NAMES: Record<string, string> = {
  '+': 'たす +',
  '-': 'ひく −',
  '*': 'かける ×',
  '/': 'わる ÷',
};

function exprToTree(e: MiniExpr): TreeNode {
  switch (e.type) {
    case 'num':
      return { label: String(e.value), chip: '数' };
    case 'var':
      return { label: e.name, chip: '名前' };
    case 'bin':
      return {
        label: OP_NAMES[e.op]!,
        chip: '式',
        children: [exprToTree(e.left), exprToTree(e.right)],
      };
  }
}

function stmtToTree(s: MiniStmt): TreeNode {
  if (s.type === 'assign') {
    return { label: `${s.name} =`, chip: '代入', children: [exprToTree(s.value)] };
  }
  return exprToTree(s.expr);
}

function programToTree(p: MiniProgram): TreeNode {
  if (p.body.length === 1) return stmtToTree(p.body[0]!);
  return { label: 'プログラム', children: p.body.map(stmtToTree) };
}

const KIND_LABELS: Record<string, string> = {
  number: '数',
  op: '計算',
  ident: '名前',
  eq: '=',
  lparen: '(',
  rparen: ')',
};

/**
 * コース2の実験室。コードを打つと、
 * ① ことばの粒 → ② 構造の木 → ③ 値 が同時にライブ更新される。
 */
export default function MiniLangLab({
  initialCode,
  stage,
  showTokens = true,
  showTree = true,
}: Props) {
  const [code, setCode] = useState(initialCode);
  const features = STAGES[stage] ?? STAGE_CALC;

  const tokens = useMemo(() => tokenizeMini(code), [code]);
  const parsed = useMemo(() => parseMini(code, features), [code, features]);
  const result = useMemo(() => runMini(code, features), [code, features]);

  return (
    <div class="astviewer minilab">
      <div class="astviewer-input">
        <label>
          <span class="astviewer-label">あなたの言語に話しかける</span>
          <textarea
            value={code}
            rows={Math.max(2, code.split('\n').length)}
            spellcheck={false}
            onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
          />
        </label>
      </div>

      {showTokens && tokens.ok && (
        <div class="astviewer-tokens">
          <span class="astviewer-label">① ことばの粒（トークン）</span>
          <div class="token-strip">
            {tokens.tokens
              .filter((t) => t.kind !== 'eof' && t.kind !== 'newline')
              .map((t, i) => (
                <span key={i} class={`token-pill token-${t.kind}`}>
                  <span class="token-text">{t.text}</span>
                  <span class="token-kind">{KIND_LABELS[t.kind] ?? t.kind}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {showTree && (
        <div class="astviewer-tree">
          <span class="astviewer-label">② 構造の木</span>
          {parsed.ok ? (
            <TreeView root={programToTree(parsed.program)} />
          ) : (
            <p class="astviewer-error">まだ木になりません — {parsed.error.message}</p>
          )}
        </div>
      )}

      <div class="minilab-result">
        <span class="astviewer-label">③ 評価された値</span>
        {result.ok ? (
          <div class="minilab-values">
            {result.values.map((v, i) => (
              <span key={i} class="minilab-value">
                {v}
              </span>
            ))}
          </div>
        ) : (
          <p class="minilab-error">
            {result.error.message}
            {result.error.hint && <span class="minilab-hint">{result.error.hint}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
