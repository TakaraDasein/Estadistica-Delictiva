import { useEffect, useMemo, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationNodeDatum } from "d3-force";
import { type Estadistica, catalogo, corto, useData } from "@/lib/data";
import { FAMILIA_COLOR } from "@/lib/color";
import { dec } from "@/lib/format";
import { Cargando } from "./Tip";

interface Nodo extends SimulationNodeDatum { id: string; familia: string; grado: number }
interface Arista { source: Nodo | string; target: Nodo | string; rho: number }
const W = 640, H = 460;

/** Grafo de co-ocurrencia territorial (D3-force): aristas = |ρ| ≥ 0,5. Cada nodo
 *  lleva su etiqueta; el color (familia) es secundario. */
export default function GrafoCorrelaciones() {
  const est = useData<Estadistica>("estadistica");
  const [pos, setPos] = useState<{ nodos: Nodo[]; aristas: Arista[] } | null>(null);
  const [foco, setFoco] = useState<string | null>(null);

  const base = useMemo(() => {
    if (!est) return null;
    const { orden, aristas } = est.correlaciones;
    const grado = (s: string) => aristas.filter((a) => a.a === s || a.b === s).length;
    const nodos: Nodo[] = orden.map((id) => ({ id, familia: catalogo.find((c) => c.categoria_slug === id)?.familia ?? "", grado: grado(id) }));
    return { nodos, aristas: aristas.map((a) => ({ source: a.a, target: a.b, rho: a.rho })) as Arista[] };
  }, [est]);

  useEffect(() => {
    if (!base) return;
    const nodos = base.nodos.map((n) => ({ ...n }));
    const aristas = base.aristas.map((a) => ({ ...a }));
    const sim = forceSimulation(nodos)
      .force("link", forceLink<Nodo, Arista>(aristas).id((d) => d.id).distance((d) => 170 - Math.abs(d.rho) * 100))
      .force("charge", forceManyBody().strength(-260))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide(46))
      .stop();
    for (let i = 0; i < 320; i++) sim.tick(); // layout estático: sin animación continua
    for (const n of nodos) { n.x = Math.max(60, Math.min(W - 60, n.x!)); n.y = Math.max(24, Math.min(H - 24, n.y!)); }
    setPos({ nodos, aristas });
  }, [base]);

  if (!est || !pos) return <Cargando />;
  const vecino = (id: string) => !foco || id === foco || pos.aristas.some((a) => {
    const s = (a.source as Nodo).id, t = (a.target as Nodo).id;
    return (s === foco && t === id) || (t === foco && s === id);
  });
  const familias = [...new Set(pos.nodos.map((n) => n.familia))];

  return (
    <div>
      <div className="controls">
        {familias.map((f) => <span key={f} className="chip" style={{ cursor: "default" }}><span className="dot" style={{ background: FAMILIA_COLOR[f] }} />{f}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} role="img"
        aria-label="Red de delitos que co-ocurren en los mismos departamentos" onMouseLeave={() => setFoco(null)}>
        {pos.aristas.map((a, i) => {
          const s = a.source as Nodo, t = a.target as Nodo;
          const activa = !foco || s.id === foco || t.id === foco;
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} strokeWidth={1 + (Math.abs(a.rho) - 0.5) * 12}
            stroke={a.rho > 0 ? "var(--div-pos)" : "var(--div-neg)"} opacity={activa ? 0.55 : 0.08}>
            <title>{`${corto(s.id)} – ${corto(t.id)}: ρ = ${dec(a.rho)}`}</title>
          </line>;
        })}
        {pos.nodos.map((n) => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`} opacity={vecino(n.id) ? 1 : 0.25}
            onMouseEnter={() => setFoco(n.id)} style={{ cursor: "pointer" }}>
            <circle r={7 + n.grado * 2} fill={FAMILIA_COLOR[n.familia] ?? "var(--axis)"} stroke="var(--surface)" strokeWidth={2} />
            <text y={-(10 + n.grado * 2)} textAnchor="middle" fontSize={11} fill="var(--ink)" paintOrder="stroke"
              stroke="var(--surface)" strokeWidth={3}>{corto(n.id)}</text>
          </g>
        ))}
      </svg>
      <p className="note">Grosor = |ρ|. Tamaño del nodo = número de conexiones. Nodos aislados no superan |ρ| ≥ 0,5 con ningún otro delito.
        Correlación entre territorios no implica causalidad.</p>
    </div>
  );
}
