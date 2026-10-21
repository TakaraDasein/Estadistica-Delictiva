import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Estadistica, corto, delitos, useData } from "@/lib/data";
import { SERIE } from "@/lib/color";
import { dec, kmil, num, pct } from "@/lib/format";
import { AXIS, Cargando, Tip } from "./Tip";

/** Curvas de Lorenz (municipios) para 3 delitos + barras de Gini para todos. */
export default function Concentracion({ inicial = ["hurto-personas", "homicidios", "abigeato"] }: { inicial?: string[] }) {
  const est = useData<Estadistica>("estadistica");
  const [sel, setSel] = useState(inicial);
  const [top, setTop] = useState(inicial[0]);
  if (!est) return <Cargando />;
  const c = (s: string) => est.concentracion.find((x) => x.categoria_slug === s)!;
  const lorenz = c(sel[0]).lorenz.map((p, i) => ({ p: p.p * 100, igualdad: p.p * 100, ...Object.fromEntries(sel.map((s) => [s, c(s).lorenz[i].l * 100])) }));
  const gini = est.concentracion.filter((x) => delitos.some((d) => d.categoria_slug === x.categoria_slug))
    .map((x) => ({ nombre: corto(x.categoria_slug), gini: x.gini, top10: x.top10_pct })).sort((a, b) => b.gini - a.gini);
  const t = c(top);

  return (
    <div className="grid-2">
      <div className="card">
        <h3>Curva de Lorenz municipal</h3>
        <p className="sub">% acumulado de casos vs. % de municipios (de menor a mayor). Cuanto más se aleja de la diagonal, más concentrado.</p>
        <div className="controls">
          {sel.map((s, i) => (
            <span key={i} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <span className="dot" style={{ background: SERIE[i] }} />
              <select aria-label={`Serie ${i + 1}`} value={s} onChange={(e) => setSel(sel.map((x, j) => (j === i ? e.target.value : x)))}>
                {delitos.map((d) => <option key={d.categoria_slug} value={d.categoria_slug}>{corto(d.categoria_slug)}</option>)}
              </select>
            </span>
          ))}
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={lorenz} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid />
              <XAxis dataKey="p" type="number" domain={[0, 100]} {...AXIS} tickFormatter={(v) => `${v} %`} />
              <YAxis domain={[0, 100]} {...AXIS} width={44} tickFormatter={(v) => `${v} %`} />
              <Tooltip cursor={{ stroke: "var(--axis)" }} content={({ active, payload, label }) => active && payload?.length ? (
                <Tip title={`${num(label as number)} % de municipios`} rows={payload.filter((p) => p.dataKey !== "igualdad").map((p) => ({
                  color: p.color as string, label: corto(String(p.dataKey)), value: `${dec(p.value as number)} % de casos` }))} />
              ) : null} />
              <Line dataKey="igualdad" stroke="var(--axis)" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              {sel.map((s, i) => <Line key={s + i} dataKey={s} stroke={SERIE[i]} strokeWidth={2} dot={false} isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h3>Coeficiente de Gini por delito</h3>
        <p className="sub">0 = repartido por igual entre municipios · 1 = todo en uno.</p>
        <div style={{ height: gini.length * 22 + 30 }}>
          <ResponsiveContainer>
            <BarChart data={gini} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }} barCategoryGap={3}>
              <XAxis type="number" domain={[0, 1]} hide />
              <YAxis type="category" interval={0} dataKey="nombre" {...AXIS} width={140} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload }) => active && payload?.length ? (
                <Tip title={(payload[0].payload as (typeof gini)[0]).nombre} rows={[
                  { label: "Gini", value: dec((payload[0].value as number) * 100) + " /100" },
                  { label: "Top-10 municipios", value: pct((payload[0].payload as (typeof gini)[0]).top10) }]} />
              ) : null} />
              <Bar dataKey="gini" fill="var(--s1)" radius={4} isAnimationActive={false}
                label={{ position: "right", fill: "var(--ink-2)", fontSize: 11, formatter: (v: unknown) => (v as number).toFixed(2) }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div className="controls">
          <h3 style={{ margin: 0 }}>Los 10 municipios con más casos (2010–2024)</h3>
          <select aria-label="Delito" value={top} onChange={(e) => setTop(e.target.value)}>
            {delitos.map((d) => <option key={d.categoria_slug} value={d.categoria_slug}>{corto(d.categoria_slug)}</option>)}
          </select>
          <span className="badge">concentran {pct(t.top10_pct)} de {num(t.municipios)} municipios</span>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={t.top10} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }} barCategoryGap={3}>
              <XAxis type="number" hide />
              <YAxis type="category" interval={0} dataKey="municipio" {...AXIS} width={150} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload }) => active && payload?.length ? (
                <Tip title={(payload[0].payload as { municipio: string }).municipio}
                  rows={[{ label: (payload[0].payload as { departamento: string }).departamento, value: num(payload[0].value as number) }]} />
              ) : null} />
              <Bar dataKey="cantidad" fill="var(--s1)" radius={4} isAnimationActive={false}
                label={{ position: "right", fill: "var(--ink-2)", fontSize: 11, formatter: (v: unknown) => kmil(v as number) }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
