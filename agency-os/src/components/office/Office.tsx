"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS, getAgent } from "@/lib/agents";
import { STATE_META } from "@/lib/agent-state";
import type { AgentCardData } from "@/lib/queries";
import { spriteRects } from "../PixelSprite";
import { AgentSheet } from "./AgentSheet";

// Oficina isométrica dibujada en SVG con estética pixel art. El estado de cada personaje viene de datos reales.

const TW = 64;
const TH = 32;
const OX = 600;
const OY = 200;
const N = 13;
const WALL = 150;

const iso = (gx: number, gy: number): [number, number] => [OX + ((gx - gy) * TW) / 2, OY + ((gx + gy) * TH) / 2];
const pts = (arr: [number, number][], dy = 0) => arr.map(([x, y]) => `${x},${y - dy}`).join(" ");

const STATIONS: Record<string, { gx: number; gy: number; zone: string }> = {
  canserbero: { gx: 2.6, gy: 2.6, zone: "DESARROLLO" },
  nas: { gx: 8.9, gy: 2.4, zone: "DISEÑO" },
  tupac: { gx: 2.4, gy: 8.9, zone: "INVESTIGACIÓN" },
  eminem: { gx: 6.5, gy: 6.5, zone: "DESPACHO CENTRAL" },
  "fifty-cent": { gx: 11.2, gy: 6.6, zone: "VENTAS" },
  biggie: { gx: 6.6, gy: 11.2, zone: "AUTOMATIZACIONES" },
  "ice-cube": { gx: 10.8, gy: 10.8, zone: "SEGURIDAD Y QA" },
};

function IsoBox({ gx, gy, w, d, h, top, left, right, lift = 0 }: { gx: number; gy: number; w: number; d: number; h: number; top: string; left: string; right: string; lift?: number }) {
  const a = iso(gx, gy), b = iso(gx + w, gy), c = iso(gx + w, gy + d), e = iso(gx, gy + d);
  return (
    <g>
      <polygon points={pts([b, c, c, b].map((p, i) => [p[0], p[1] - (i < 2 ? lift + h : lift)] as [number, number]))} fill={right} />
      <polygon points={pts([e, c, c, e].map((p, i) => [p[0], p[1] - (i < 2 ? lift + h : lift)] as [number, number]))} fill={left} />
      <polygon points={pts([a, b, c, e], lift + h)} fill={top} />
    </g>
  );
}

function Plant({ gx, gy }: { gx: number; gy: number }) {
  const [x, y] = iso(gx, gy);
  return (
    <g transform={`translate(${x - 12},${y - 40})`} className="pixel">
      <rect x="6" y="28" width="12" height="12" fill="#7c3f1d" />
      <rect x="6" y="28" width="12" height="3" fill="#9a4f26" />
      <rect x="10" y="8" width="4" height="20" fill="#166534" />
      <rect x="2" y="10" width="8" height="6" fill="#22c55e" />
      <rect x="14" y="4" width="8" height="6" fill="#22c55e" />
      <rect x="4" y="18" width="6" height="5" fill="#15803d" />
      <rect x="14" y="16" width="7" height="6" fill="#15803d" />
      <rect x="8" y="0" width="6" height="6" fill="#4ade80" />
    </g>
  );
}

function Station({ data, frame, onOpen, layer }: { data: AgentCardData; frame: 0 | 1; onOpen: () => void; layer: "body" | "bubble" }) {
  const agent = getAgent(data.id)!;
  const st = STATIONS[data.id];
  const meta = STATE_META[data.state];
  const working = data.state === "trabajando";
  const rects = spriteRects(agent.sprite, working ? frame : 0);
  const S = 3; // escala del sprite
  const spriteW = 16 * S;
  const spriteH = 24 * S;
  const isCeo = data.id === "eminem";

  const [px, py] = iso(st.gx + 0.35, st.gy + 0.35);
  const R = 1.35;
  const bubble = (
    <>
      <g transform={`translate(${px},${py - spriteH - 16})`}>
        <rect x={-66} y={-34} width={132} height={46} rx={7} fill="#0d0d14" stroke={meta.color} strokeWidth={1.5} opacity={0.96} />
        <polygon points="-6,12 6,12 0,19" fill="#0d0d14" stroke={meta.color} strokeWidth={1.5} />
        <rect x={-6} y={10} width={12} height={3} fill="#0d0d14" />
        <text x={-56} y={-17} fontSize={12} fontWeight={800} fill="#fff" fontFamily="ui-sans-serif, system-ui">{isCeo ? "♛ " : ""}{agent.name}</text>
        <text x={-56} y={-5} fontSize={7.5} fill={agent.color} fontFamily="monospace" letterSpacing={0.6}>{st.zone}</text>
        <circle cx={-52} cy={4} r={3.5} fill={meta.color} className={data.state === "pensando" ? "anim-blink" : undefined} />
        <text x={-44} y={7.5} fontSize={9.5} fill={meta.color} fontFamily="ui-sans-serif, system-ui">{data.state === "pensando" ? "Pensando…" : meta.label}</text>
        {data.state === "aprobacion" && <text x={52} y={-14} fontSize={15} fontWeight={900} fill={meta.color} className="anim-blink">!</text>}
        {data.state === "error" && <text x={48} y={-14} fontSize={13} fontWeight={900} fill={meta.color}>✕</text>}
        {data.state === "completado" && <text x={48} y={-14} fontSize={13} fontWeight={900} fill={meta.color}>✓</text>}
      </g>
    </>
  );
  if (layer === "bubble") return (
    <g onClick={onOpen} className="cursor-pointer">
      {bubble}
    </g>
  );
  return (
    <g role="button" tabIndex={0} aria-label={`${agent.name}: ${meta.label}`} onClick={onOpen} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()} className="cursor-pointer outline-none [&:focus-visible>rect.hit]:stroke-brand">
      {/* Alfombra de zona */}
      <polygon points={pts([iso(st.gx - R, st.gy - R), iso(st.gx + R, st.gy - R), iso(st.gx + R, st.gy + R), iso(st.gx - R, st.gy + R)])} fill={`${agent.color}${isCeo ? "33" : "1f"}`} stroke={`${agent.color}77`} strokeWidth={1.5} strokeDasharray={isCeo ? "0" : "6 4"} />
      {/* Escritorio (detrás del personaje) con dos monitores mirando al espectador */}
      <IsoBox gx={st.gx - 1} gy={st.gy - 1.05} w={1.9} d={0.8} h={24} top={isCeo ? "#4a2c18" : "#30303f"} left={isCeo ? "#2c190c" : "#1f1f2b"} right={isCeo ? "#1e1108" : "#181822"} />
      {[-0.5, 0.45].map((off, i) => {
        const [mx, my] = iso(st.gx - 0.25 + off, st.gy - 0.85 - off);
        return (
          <g key={i}>
            <rect x={mx - 14} y={my - 56} width={28} height={20} rx={2} fill="#0b0b12" stroke="#3a3a4c" />
            <rect x={mx - 12} y={my - 54} width={24} height={16} fill={data.state === "disponible" || data.state === "desactivado" ? "#1a2233" : agent.color} className={data.state === "trabajando" || data.state === "pensando" ? "anim-glow" : undefined} opacity={0.9} />
            {data.state !== "disponible" && data.state !== "desactivado" && [0, 1, 2].map((l) => <rect key={l} x={mx - 9} y={my - 51 + l * 4} width={10 + ((l * 7) % 9)} height={2} fill="#0b0b12" opacity={0.55} />)}
            <rect x={mx - 2} y={my - 36} width={4} height={8} fill="#3a3a4c" />
          </g>
        );
      })}
      {/* Personaje */}
      <g transform={`translate(${px - spriteW / 2},${py - spriteH + 4})`} className={working ? "anim-bob" : data.state === "error" ? "anim-shake" : undefined} opacity={data.state === "desactivado" ? 0.35 : 1}>
        <ellipse cx={spriteW / 2} cy={spriteH - 2} rx={spriteW / 2.3} ry={6} fill="#000" opacity={0.4} />
        <g transform={`scale(${S})`} className="pixel">
          {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />)}
        </g>
      </g>
      <rect className="hit" x={px - 70} y={py - spriteH - 52} width={140} height={spriteH + 62} fill="transparent" stroke="transparent" strokeWidth={2} rx={10} />
    </g>
  );
}

export function Office({ agents, leads, projects }: { agents: AgentCardData[]; leads: { id: string; business_name: string }[]; projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [frame, setFrame] = useState<0 | 1>(0);
  const active = agents.some((a) => a.state === "trabajando" || a.state === "pensando");

  // Animación de tecleo solo si hay ejecuciones reales en curso; refresco del estado real.
  useEffect(() => {
    if (!active) return;
    const f = setInterval(() => setFrame((x) => (x ? 0 : 1)), 350);
    const r = setInterval(() => router.refresh(), 5000);
    return () => { clearInterval(f); clearInterval(r); };
  }, [active, router]);
  useEffect(() => {
    const r = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(r);
  }, [router]);

  const ordered = useMemo(() => [...agents].sort((a, b) => STATIONS[a.id].gx + STATIONS[a.id].gy - (STATIONS[b.id].gx + STATIONS[b.id].gy)), [agents]);
  const tiles = useMemo(() => {
    const out: { key: string; p: string; fill: string }[] = [];
    for (let x = 0; x < N; x++)
      for (let y = 0; y < N; y++)
        out.push({ key: `${x}-${y}`, p: pts([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)]), fill: (x + y) % 2 ? "#1e1a1f" : "#231e22" });
    return out;
  }, []);

  const L0 = iso(0, 0), LR = iso(N, 0), LL = iso(0, N);
  const selected = agents.find((a) => a.id === open) ?? null;

  return (
    <div className="relative">
      <svg viewBox="150 30 900 620" className="h-auto w-full select-none" role="img" aria-label="Oficina virtual de AGENCY OS">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b0f2e" />
            <stop offset="0.6" stopColor="#7c2d12" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="wallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#17141c" /><stop offset="1" stopColor="#201b26" /></linearGradient>
          <linearGradient id="wallR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#25202b" /><stop offset="1" stopColor="#1a161f" /></linearGradient>
        </defs>
        {/* Paredes */}
        <polygon points={pts([L0, LL, [LL[0], LL[1] - WALL], [L0[0], L0[1] - WALL]])} fill="url(#wallL)" />
        <polygon points={pts([L0, LR, [LR[0], LR[1] - WALL], [L0[0], L0[1] - WALL]])} fill="url(#wallR)" />
        {/* Ventanales con skyline (pared derecha) */}
        {[1.2, 4.6, 8].map((g, i) => {
          const a = iso(g, 0), b = iso(g + 2.8, 0);
          return (
            <g key={i}>
              <polygon points={pts([[a[0], a[1] - 30], [b[0], b[1] - 30], [b[0], b[1] - 125], [a[0], a[1] - 125]])} fill="url(#sky)" stroke="#3a2f45" strokeWidth={4} />
              {[0.3, 0.8, 1.3, 1.8, 2.3].map((o, j) => {
                const p = iso(g + o, 0);
                const hgt = 22 + ((i * 7 + j * 13) % 40);
                return <polygon key={j} points={pts([[p[0], p[1] - 30], [p[0] + 12, p[1] - 24], [p[0] + 12, p[1] - 24 - hgt], [p[0], p[1] - 30 - hgt]])} fill="#120d1a" opacity={0.9} />;
              })}
            </g>
          );
        })}
        {/* Rótulo en pared izquierda */}
        <g transform={`matrix(1,-0.5,0,1,${iso(0, 9.5)[0]},${iso(0, 9.5)[1] - 70})`}>
          <rect x={0} y={-28} width={210} height={46} rx={4} fill="#0e0b12" stroke="#f97316" strokeOpacity={0.5} />
          <text x={14} y={2} fontSize={24} fontWeight={900} fill="#f97316" fontFamily="ui-sans-serif, system-ui" className="anim-glow">AGENCY OS</text>
          <text x={14} y={14} fontSize={8} fill="#fdba74" fontFamily="monospace">AUTOMATIZA · ESCALA · CRECE</text>
        </g>
        <g transform={`matrix(1,-0.5,0,1,${iso(0, 4.5)[0]},${iso(0, 4.5)[1] - 60})`}>
          <rect x={0} y={-30} width={150} height={60} fill="#0f1a2a" stroke="#3b82f6" strokeOpacity={0.5} />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={10 + i * 27} y={18 - (i * 9) % 30} width={14} height={(i * 9) % 30 + 4} fill="#3b82f6" opacity={0.6} />)}
        </g>
        {/* Suelo */}
        {tiles.map((t) => <polygon key={t.key} points={t.p} fill={t.fill} stroke="#2b2430" strokeWidth={0.6} />)}
        <polygon points={pts([iso(0, 0), iso(N, 0), iso(N, N), iso(0, N)])} fill="none" stroke="#f97316" strokeOpacity={0.35} strokeWidth={2} />
        {/* Decoración */}
        <Plant gx={0.6} gy={0.6} />
        <Plant gx={12.3} gy={0.6} />
        <Plant gx={0.6} gy={12.3} />
        <IsoBox gx={0.2} gy={5.2} w={0.8} d={1.6} h={60} top="#2c2433" left="#211b27" right="#18141d" />
        {/* Puestos */}
        {ordered.map((a) => <Station key={a.id} layer="body" data={a} frame={frame} onOpen={() => setOpen(a.id)} />)}
        {ordered.map((a) => <Station key={`b-${a.id}`} layer="bubble" data={a} frame={frame} onOpen={() => setOpen(a.id)} />)}
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(STATE_META).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: v.color }} />{v.label}</span>
        ))}
        <span className="ml-auto">{AGENTS.length} puestos · haz clic en un personaje para abrir su ficha</span>
      </div>
      {selected && <AgentSheet data={selected} leads={leads} projects={projects} onClose={() => setOpen(null)} />}
    </div>
  );
}
