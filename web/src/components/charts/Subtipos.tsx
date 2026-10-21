import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Subtipo, useData } from "@/lib/data";
import { kmil, num, pct } from "@/lib/format";
import { AXIS, Cargando, Seg, Tip } from "./Tip";

/** Desagregación por artículo del Código Penal (sólo series que la publican). */
export default function Subtipos({ inicial = "delitos-sexuales" }: { inicial?: string }) {
  const datos = useData<Subtipo[]>("subtipos");
  const [slug, setSlug] = useState(inicial);
  if (!datos) return <Cargando />;
  const acc = new Map<string, { subtipo: string; articulo: string | null; cantidad: number }>();
  let anios = new Set<number>();
  for (const r of datos) {
    if (r.categoria_slug !== slug) continue;
    anios.add(r.anio);
    const a = acc.get(r.subtipo) ?? { subtipo: r.subtipo, articulo: r.articulo, cantidad: 0 };
    a.cantidad += r.cantidad;
    acc.set(r.subtipo, a);
  }
  const filas = [...acc.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 12)
    .map((f) => ({ ...f, etiqueta: `Art. ${f.articulo ?? "–"} · ${f.subtipo.length > 46 ? f.subtipo.slice(0, 44) + "…" : f.subtipo}` }));
  const total = filas.reduce((a, b) => a + b.cantidad, 0);
  const rango = [...anios].sort();

  return (
    <div>
      <div className="controls">
        <Seg label="Delito" value={slug} onChange={setSlug} options={[["delitos-sexuales", "Delitos sexuales"], ["secuestro", "Secuestro"]]} />
        <span className="badge">Disponible {rango[0]}–{rango.at(-1)}</span>
      </div>
      <div style={{ height: filas.length * 30 + 20 }}>
        <ResponsiveContainer>
          <BarChart data={filas} layout="vertical" margin={{ top: 0, right: 56, left: 8, bottom: 0 }} barCategoryGap={4}>
            <XAxis type="number" hide />
            <YAxis type="category" interval={0} dataKey="etiqueta" {...AXIS} width={300} axisLine={false} tick={{ fill: "var(--ink-2)", fontSize: 11 }} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload }) => active && payload?.length ? (
              <Tip title={(payload[0].payload as (typeof filas)[0]).subtipo} rows={[
                { label: "Casos", value: num(payload[0].value as number) },
                { label: "Del total con subtipo", value: pct(((payload[0].value as number) / total) * 100) }]} />
            ) : null} />
            <Bar dataKey="cantidad" fill="var(--s2)" radius={4} isAnimationActive={false}
              label={{ position: "right", fill: "var(--ink-2)", fontSize: 11, formatter: (v: unknown) => kmil(v as number) }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="note">La fuente sólo publica el artículo en algunos años; los totales aquí son menores que los del delito completo.</p>
    </div>
  );
}
