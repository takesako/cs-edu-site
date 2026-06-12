import { edgeLabelText, type Nfa } from '../../engine/regex';

interface Props {
  nfa: Nfa;
  /** いま立っている状態（ステップ実行モードで点灯させる） */
  active?: number[];
}

const DX = 78;
const DY = 56;
const R = 14;
const MAX_STATES = 26;

interface Point {
  x: number;
  y: number;
}

/** startからのBFSで層に分け、左から右へ並べる */
function layout(nfa: Nfa): Map<number, Point> {
  const layers: number[][] = [];
  const seen = new Set<number>([nfa.start]);
  let frontier = [nfa.start];
  while (frontier.length > 0) {
    layers.push(frontier);
    const next: number[] = [];
    for (const s of frontier) {
      for (const e of nfa.edges) {
        if (e.from === s && !seen.has(e.to)) {
          seen.add(e.to);
          next.push(e.to);
        }
      }
    }
    frontier = next;
  }
  const points = new Map<number, Point>();
  const maxRows = Math.max(...layers.map((l) => l.length));
  const midY = ((maxRows - 1) * DY) / 2 + R + 24;
  layers.forEach((layer, li) => {
    layer.forEach((s, ri) => {
      points.set(s, {
        x: li * DX + R + 30,
        y: midY + (ri - (layer.length - 1) / 2) * DY,
      });
    });
  });
  return points;
}

/**
 * 状態機械の図。状態は丸、受理状態は二重丸、遷移は矢印。
 * 凝ったレイアウトはしない——「機械が状態と矢印でできている」ことが伝われば十分。
 */
export default function NfaDiagram({ nfa, active }: Props) {
  if (nfa.stateCount > MAX_STATES) {
    return (
      <p class="regexlab-note">
        この機械は状態が{nfa.stateCount}個あって、ここに描くには大きすぎます。もようを短くすると、図が現れます。
      </p>
    );
  }

  const points = layout(nfa);
  const activeSet = new Set(active ?? []);
  const width = Math.max(...[...points.values()].map((p) => p.x)) + R + 30;
  const height = Math.max(...[...points.values()].map((p) => p.y)) + R + 28;

  // 同じ状態対の辺が複数あるとき、弧をずらすための通し番号
  const pairCount = new Map<string, number>();

  return (
    <div class="regexlab-diagram" role="img" aria-label={`状態が${nfa.stateCount}個ある状態機械の図`}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: `${Math.min(width, 640)}px` }}>
        <defs>
          <marker id="nfa-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
          </marker>
        </defs>
        {nfa.edges.map((e, i) => {
          const from = points.get(e.from)!;
          const to = points.get(e.to)!;
          const key = `${e.from}-${e.to}`;
          const nth = pairCount.get(key) ?? 0;
          pairCount.set(key, nth + 1);
          const backward = to.x <= from.x;
          // 弧のふくらみ：戻る辺は大きく下へ、進む辺はわずかに上へ
          const bow = backward ? 38 + nth * 18 : (Math.abs(to.x - from.x) > DX ? 26 : 10) + nth * 16;
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2 + (backward ? bow : -bow);
          const label = edgeLabelText(e.label);
          return (
            <g key={i} class={`nfa-edge ${e.label.type === 'eps' ? 'is-eps' : ''}`}>
              <path
                d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                fill="none"
                marker-end="url(#nfa-arrow)"
              />
              <text x={mx} y={(from.y + to.y) / 2 + (backward ? bow * 0.72 : -bow * 0.72)} text-anchor="middle" dominant-baseline="middle">
                {label}
              </text>
            </g>
          );
        })}
        {[...points.entries()].map(([s, p]) => (
          <g key={s} class={`nfa-state ${activeSet.has(s) ? 'is-active' : ''} ${s === nfa.accept ? 'is-accept' : ''}`}>
            {s === nfa.start && (
              <path class="nfa-start-arrow" d={`M ${p.x - R - 20} ${p.y} L ${p.x - R - 4} ${p.y}`} marker-end="url(#nfa-arrow)" />
            )}
            <circle cx={p.x} cy={p.y} r={R} />
            {s === nfa.accept && <circle cx={p.x} cy={p.y} r={R - 3.5} fill="none" />}
            <text x={p.x} y={p.y} text-anchor="middle" dominant-baseline="central">
              {s}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
