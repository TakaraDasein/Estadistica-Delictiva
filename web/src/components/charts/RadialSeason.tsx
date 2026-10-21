import { useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { type Estadistica, corto, delitos, useData, MESES } from "@/lib/data";
import { SERIE } from "@/lib/color";
import { dec } from "@/lib/format";
import { Cargando, Tip } from "./Tip";

/** Reloj estacional: índice mensual STL (100 = mes promedio). Máx. 3 series. */
export default function RadialSeason({ inicial = ["violencia-intrafamiliar", "homicidios", "hurto-personas"] }: { inicial?: string[] }) {
  const est = useData<Estadistica>("estadistica");
  const [sel, setSel] = useState(inicial);
  if (!est) return <Cargando />;
  const datos = MESES.map((m, i) => {
    const f: Record<string, number | string> = { mes: m };
    for (const s of sel) f[s] = est.estacionalidad.find((e) => e.categoria_slug === s)?.indice_mes[i] ?? 100;
    return f;
  });
  const cambiar = (i: number, v: string) => setSel(sel.map((s, j) => (j === i ? v : s)));
  const valores = datos.flatMap((d) => sel.map((s) => d[s] as number));
  const lo = Math.floor(Math.min(...valores) / 5) * 5, hi = Math.ceil(Math.max(...valores) / 5) * 5;

  return (
    <div>
      <div className="controls">
        {sel.map((s, i) => (
          <span key={i} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span className="dot" style={{ background: SERIE[i] }} />
            <select aria-label={`Serie ${i + 1}`} value={s} onChange={(e) => cambiar(i, e.target.value)}>
              {delitos.map((c) => <option key={c.categoria_slug} value={c.categoria_slug}>{corto(c.categoria_slug)}</option>)}
            </select>
          </span>
        ))}
      </div>
      <div style={{ height: 360 }}>
        <ResponsiveContainer>
          <RadarChart data={datos} outerRadius="78%">
            <PolarGrid stroke="var(--grid)" />
            <PolarAngleAxis dataKey="mes" tick={{ fill: "var(--ink-2)", fontSize: 12 }} />
            <PolarRadiusAxis domain={[lo, hi]} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} angle={90} tickCount={4} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <Tip title={label} rows={payload.map((p) => ({ color: p.color as string, label: corto(String(p.dataKey)), value: dec(p.value as number) }))} foot="100 = mes promedio" />
            ) : null} />
            {sel.map((s, i) => (
              <Radar key={s + i} dataKey={s} stroke={SERIE[i]} strokeWidth={2} fill={SERIE[i]} fillOpacity={0.08} isAnimationActive={false} />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
