import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Estadistica, corto, useData } from "@/lib/data";
import { num, pct } from "@/lib/format";
import { AXIS, Cargando, Seg, Tip } from "./Tip";

type Medida = "abril" | "anual";

/** Barras divergentes: desvío frente al contrafactual (azul = menos, rojo = más). */
export default function CovidChart() {
  const est = useData<Estadistica>("estadistica");
  const [m, setM] = useState<Medida>("abril");
  if (!est) return <Cargando />;
  const key = m === "abril" ? "abril_2020_vs_2019_pct" : "desvio_pct";
  const datos = est.covid
    .filter((c) => c[key] != null && Number.isFinite(c[key] as number))
    .map((c) => ({ ...c, nombre: corto(c.categoria_slug), v: Math.max(-100, Math.min(100, c[key] as number)), real: c[key] as number }))
    .sort((a, b) => a.v - b.v);

  return (
    <div>
      <div className="controls">
        <Seg<Medida> label="Comparación" value={m} onChange={setM}
          options={[["abril", "Abril 2020 vs abril 2019"], ["anual", "2020 vs tendencia 2015–19"]]} />
      </div>
      <div style={{ height: datos.length * 24 + 40 }}>
        <ResponsiveContainer>
          <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }} barCategoryGap={4}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[-100, 100]} {...AXIS} tickFormatter={(v) => `${v} %`} />
            <YAxis type="category" interval={0} dataKey="nombre" {...AXIS} width={140} axisLine={false} />
            <ReferenceLine x={0} stroke="var(--axis)" />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof datos)[number];
              return <Tip title={d.nombre} rows={m === "anual"
                ? [{ label: "Observado 2020", value: num(d.observado_2020) }, { label: "Esperado", value: num(d.esperado_2020) }, { label: "Desvío", value: pct(d.real, true) }]
                : [{ label: "Variación", value: pct(d.real, true) }]} />;
            }} />
            <Bar dataKey="v" radius={4} isAnimationActive={false}>
              {datos.map((d) => <Cell key={d.categoria_slug} fill={d.v < 0 ? "var(--div-neg)" : "var(--div-pos)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Azul = por debajo de lo esperado; rojo = por encima. Valores recortados a ±100 % (el tooltip muestra el real).
        Con bases pequeñas (terrorismo, secuestro) el porcentaje es inestable.</p>
    </div>
  );
}
