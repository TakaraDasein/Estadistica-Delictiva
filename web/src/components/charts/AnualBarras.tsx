import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Anual, useData } from "@/lib/data";
import { kmil, num, pct } from "@/lib/format";
import { AXIS, Cargando, Tip } from "./Tip";

/** Casos por año de una categoría; años parciales en tono atenuado. */
export default function AnualBarras({ slug }: { slug: string }) {
  const anual = useData<Anual[]>("anual");
  if (!anual) return <Cargando />;
  const filas = anual.filter((r) => r.categoria_slug === slug);
  return (
    <>
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={filas} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={3}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="anio" {...AXIS} />
            <YAxis {...AXIS} axisLine={false} width={48} tickFormatter={kmil} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as Anual;
              return <Tip title={r.anio} rows={[
                { label: "Casos", value: num(r.cantidad) },
                { label: "Por 100 mil hab.", value: num(r.tasa_100k) },
                { label: "Var. anual", value: pct(r.var_anual_pct, true) },
                { label: "Var. ene–oct", value: pct(r.var_ene_oct_pct, true) },
              ]} foot={r.anio_completo ? undefined : `Año parcial: ${r.meses} meses`} />;
            }} />
            <Bar dataKey="cantidad" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {filas.map((r) => <Cell key={r.anio} fill="var(--s1)" fillOpacity={r.anio_completo ? 1 : 0.4} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Barras tenues = años con meses faltantes en la fuente (no comparables en total anual).</p>
    </>
  );
}
