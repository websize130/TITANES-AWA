import { getAgent, type SpriteSpec } from "@/lib/agents";

// Sprites pixel art originales (16×24) generados por código a partir de la especificación de cada agente.

const W = 16;
const H = 24;
type Grid = string[][];

function blank(): Grid {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => "."));
}

function fill(g: Grid, x0: number, y0: number, x1: number, y1: number, c: string) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && x >= 0 && x < W) g[y][x] = c;
}

function px(g: Grid, pts: [number, number][], c: string) {
  for (const [x, y] of pts) if (g[y]) g[y][x] = c;
}

function build(spec: SpriteSpec, frame: 0 | 1): Grid {
  const g = blank();
  // Cabeza
  fill(g, 4, 4, 11, 11, "k");
  fill(g, 5, 5, 10, 10, "s");
  fill(g, 5, 4, 10, 6, "h");
  px(g, [[5, 7], [10, 7]], "h");
  fill(g, 10, 8, 10, 10, "S");
  px(g, [[6, 8], [9, 8]], "e");
  px(g, [[7, 10], [8, 10]], "m");
  // Cuello y torso
  fill(g, 7, 12, 8, 12, "S");
  fill(g, 3, 12, 12, 18, "k");
  fill(g, 7, 12, 8, 12, "S");
  fill(g, 4, 13, 11, 17, "c");
  fill(g, 11, 13, 11, 17, "C");
  fill(g, 7, 14, 8, 17, "a");
  // Brazos (animación de tecleo con frame)
  fill(g, 0, 13, 2, 17, "k");
  fill(g, 13, 13, 15, 17, "k");
  fill(g, 1, 13, 2, 16, "C");
  fill(g, 13, 13, 14, 16, "C");
  fill(g, 1, 17 - frame, 2, 17 - frame, "s");
  fill(g, 13, 16 + frame, 14, 16 + frame, "s");
  // Piernas y zapatos
  fill(g, 4, 19, 11, 21, "p");
  fill(g, 7, 20, 8, 21, ".");
  fill(g, 3, 22, 6, 22, "b");
  fill(g, 9, 22, 12, 22, "b");

  if (spec.chain) {
    fill(g, 5, 13, 10, 13, "y");
    px(g, [[6, 14], [9, 14], [7, 15], [8, 15]], "y");
  }
  if (spec.glasses) {
    fill(g, 5, 8, 10, 8, "g");
    px(g, [[6, 8], [9, 8]], "l");
  }
  switch (spec.hat) {
    case "crown":
      fill(g, 4, 3, 11, 3, "H");
      px(g, [[4, 2], [4, 1], [7, 2], [8, 2], [7, 1], [8, 1], [11, 2], [11, 1], [5, 2], [10, 2]], "H");
      px(g, [[6, 3], [9, 3]], "G");
      break;
    case "cap":
      fill(g, 5, 2, 10, 2, "H");
      fill(g, 4, 3, 11, 4, "H");
      fill(g, 9, 5, 14, 5, "G");
      px(g, [[6, 3]], "G");
      break;
    case "headphones":
      fill(g, 5, 2, 10, 2, "H");
      px(g, [[4, 3], [11, 3], [4, 4], [11, 4]], "H");
      fill(g, 3, 6, 4, 9, "G");
      fill(g, 11, 6, 12, 9, "G");
      break;
    case "beanie":
      fill(g, 7, 1, 8, 1, "G");
      fill(g, 6, 2, 9, 2, "H");
      fill(g, 5, 3, 10, 3, "H");
      fill(g, 4, 4, 11, 5, "H");
      fill(g, 4, 6, 11, 6, "G");
      break;
    case "beret":
      px(g, [[8, 1]], "H");
      fill(g, 5, 2, 12, 2, "H");
      fill(g, 4, 3, 12, 4, "H");
      px(g, [[12, 5]], "H");
      px(g, [[6, 3]], "G");
      break;
    case "snapback":
      fill(g, 5, 2, 10, 2, "H");
      fill(g, 4, 3, 11, 4, "H");
      fill(g, 3, 5, 12, 5, "G");
      px(g, [[7, 3], [8, 3]], "G");
      break;
    case "helmet":
      fill(g, 5, 1, 10, 1, "H");
      fill(g, 4, 2, 11, 5, "H");
      fill(g, 4, 6, 11, 6, "G");
      px(g, [[7, 2]], "G");
      break;
  }
  return g;
}

function palette(spec: SpriteSpec): Record<string, string> {
  return {
    k: "#14141c", s: spec.skin, S: spec.skinShade, h: spec.hair, e: "#101010", m: "#7a3b2e",
    c: spec.outfit, C: spec.outfitShade, a: spec.accent, p: spec.pants, b: spec.shoes,
    H: spec.hatColor, G: spec.hatAccent, g: "#0d0d0d", l: "#7dd3fc", y: "#f5c542",
  };
}

export function spriteRects(spec: SpriteSpec, frame: 0 | 1 = 0) {
  const g = build(spec, frame);
  const pal = palette(spec);
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = g[y][x];
      if (c === ".") { x++; continue; }
      let w = 1;
      while (x + w < W && g[y][x + w] === c) w++;
      rects.push({ x, y, w, fill: pal[c] });
      x += w;
    }
  }
  return rects;
}

export function PixelSprite({ agentId, size = 64, frame = 0, className }: { agentId: string; size?: number; frame?: 0 | 1; className?: string }) {
  const agent = getAgent(agentId);
  if (!agent) return null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={(size * W) / H} height={size} className={`pixel ${className ?? ""}`} role="img" aria-label={`Avatar de ${agent.name}`}>
      {spriteRects(agent.sprite, frame).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

/** Avatar cuadrado (busto) para listas. */
export function AgentAvatar({ agentId, size = 40 }: { agentId: string; size?: number }) {
  const agent = getAgent(agentId);
  if (!agent) return null;
  return (
    <div className="relative shrink-0 overflow-hidden rounded-lg border border-line" style={{ width: size, height: size, background: `linear-gradient(160deg, ${agent.color}33, #0d0d14)` }}>
      <svg viewBox="2 0 12 14" width={size} height={size} className="pixel" aria-label={`Avatar de ${agent.name}`}>
        {spriteRects(agent.sprite).map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
        ))}
      </svg>
    </div>
  );
}
