import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Estadistica, corto, delitos, operativos, useData, MESES } from "@/lib/data";
import { dec, kmil, num } from "@/lib/format";
import { AXIS, Cargando, Tip } from "./Tip";

/** Descomposición STL: serie mensual observada vs. tendencia de largo plazo. */
export default function StlChart({ inicial = "violencia-intrafamiliar", fijo = false }: { inicial?: string; fijo?: boolean }) {
  const est = useData<Estadistica>("estadistica");
  const [slug, setSlug] = useState(inicial);
  if (!est) return <Cargando />;
  const s = est.stl.find((x) => x.categoria_slug === slug);
  const e = est.estacionalidad.find((x) => x.categoria_slug === slug);

  return (
    <div>
      {!fijo && (
        <div className="controls">
          <label htmlFor="stl-sel">Delito</label>
          <select id="stl-sel" value={slug} onChange={(ev) => setSlug(ev.target.value)}>
            {[...delitos, ...operativos].map((c) => <option key={c.categoria_slug} value={c.categoria_slug}>{corto(c.categoria_slug)}</option>)}
          </select>
          {e && <span className="badge">Fuerza estacional F<sub>s</sub> = {dec(e.fuerza_estacional)} · pico {MESES[e.mes_pico - 1]} · valle {MESES[e.mes_valle - 1]}</span>}
        </div>
      )}
      {!s ? <p className="note">Serie insuficiente para STL.</p> : (
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={s.puntos} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="periodo" {...AXIS} interval={23} tickFormatter={(v: string) => v.slice(0, 4)} />
              <YAxis {...AXIS} axisLine={false} width={52} tickFormatter={kmil} />
              <Tooltip cursor={{ stroke: "var(--axis)" }} content={({ active, payload, label }) => active && payload?.length ? (
                <Tip title={label} rows={payload.map((p) => ({ color: p.color as string, label: p.name as string, value: num(p.value as number) }))} />
              ) : null} />
              <Line name="Observado" dataKey="observado" stroke="var(--axis)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line name="Tendencia (STL)" dataKey="tendencia" stroke="var(--s1)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="note"><span className="dot" style={{ background: "var(--axis)" }} /> Observado mensual ·{" "}
        <span className="dot" style={{ background: "var(--s1)" }} /> Tendencia STL robusta (log, periodo 12). Meses de años sin archivo se interpolan.</p>
    </div>
  );
}
