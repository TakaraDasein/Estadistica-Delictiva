import { useMemo, useState } from "react";
import { type Estadistica, type Temporal, corto, delitos, useData, DIAS, MESES } from "@/lib/data";
import { rampaSeq } from "@/lib/color";
import { dec, num, pct } from "@/lib/format";
import { Cargando } from "./Tip";

/** Mapa de calor día de la semana × mes. Valor = índice vs. celda promedio (100). */
export default function HeatmapSemana({ inicial = "homicidios", fijo = false }: { inicial?: string; fijo?: boolean }) {
  const datos = useData<Temporal[]>("temporal");
  const est = useData<Estadistica>("estadistica");
  const [slug, setSlug] = useState(inicial);
  const [hover, setHover] = useState<{ m: number; d: number } | null>(null);

  const matriz = useMemo(() => {
    if (!datos) return null;
    const m = Array.from({ length: 12 }, () => Array(7).fill(0));
    for (const r of datos) if (r.categoria_slug === slug) m[r.mes - 1][r.dia_semana] += r.cantidad;
    const media = m.flat().reduce((a, b) => a + b, 0) / 84;
    return m.map((fila) => fila.map((v) => (v / media) * 100));
  }, [datos, slug]);

  if (!matriz || !est) return <Cargando />;
  const color = rampaSeq(matriz.flat());
  const ds = est.dia_semana.find((d) => d.categoria_slug === slug);
  const W = 44, H = 26, L = 40, T = 22;

  return (
    <div>
      {!fijo && (
        <div className="controls">
          <label htmlFor="hm-sel">Delito</label>
          <select id="hm-sel" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {delitos.map((c) => <option key={c.categoria_slug} value={c.categoria_slug}>{corto(c.categoria_slug)}</option>)}
          </select>
        </div>
      )}
      {ds && <p className="sub">Día pico: <b>{ds.dia_pico}</b> · fin de semana {pct(ds.fin_de_semana_pct)} de los casos (uniforme = 28,6 %) · V de Cramér {dec(ds.v_cramer * 100)}/100</p>}
      <div className="table-scroll">
        <svg viewBox={`0 0 ${L + 7 * W} ${T + 12 * H}`} style={{ width: "100%", maxWidth: 420, display: "block" }} role="img"
          aria-label={`Mapa de calor de ${corto(slug)} por mes y día de la semana`}>
          {DIAS.map((d, j) => <text key={d} x={L + j * W + W / 2} y={14} textAnchor="middle" fontSize={11} fill="var(--muted)">{d}</text>)}
          {matriz.map((fila, i) => (
            <g key={i}>
              <text x={L - 6} y={T + i * H + H / 2 + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{MESES[i]}</text>
              {fila.map((v, j) => (
                <rect key={j} x={L + j * W + 1} y={T + i * H + 1} width={W - 2} height={H - 2} rx={3} fill={color(v)}
                  stroke={hover?.m === i && hover.d === j ? "var(--ink)" : "none"} strokeWidth={1.5}
                  onMouseEnter={() => setHover({ m: i, d: j })} onMouseLeave={() => setHover(null)}>
                  <title>{`${MESES[i]} · ${DIAS[j]}: índice ${num(v)}`}</title>
                </rect>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <p className="note">{hover ? `${MESES[hover.m]} · ${DIAS[hover.d]}: índice ${num(matriz[hover.m][hover.d])} (100 = celda promedio)`
        : "Más oscuro = más casos que la celda promedio. Pasa el cursor por una celda."}</p>
    </div>
  );
}
