import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Anual, corto, delitos, operativos, useData } from "@/lib/data";
import { SERIE } from "@/lib/color";
import { dec, kmil, num } from "@/lib/format";
import { AXIS, Cargando, Seg, Tip } from "./Tip";

type Modo = "indice" | "tasa" | "cantidad";
const MAX = 4; // ≤ 4 series: leyenda + etiqueta directa (regla de identidad)

export default function TrendExplorer({ inicial = ["hurto-personas", "violencia-intrafamiliar", "homicidios"], dominio = "delitos" }: { inicial?: string[]; dominio?: "delitos" | "operativos" }) {
  const anual = useData<Anual[]>("anual");
  const [sel, setSel] = useState<string[]>(inicial);
  const [modo, setModo] = useState<Modo>("indice");
  const opciones = dominio === "delitos" ? delitos : operativos;

  // El color sigue a la entidad: se asigna por orden de selección y no se repinta al quitar otra.
  const [colores, setColores] = useState<Record<string, string>>(() => Object.fromEntries(inicial.map((s, i) => [s, SERIE[i]])));

  const toggle = (slug: string) => {
    if (sel.includes(slug)) { setSel(sel.filter((s) => s !== slug)); return; }
    if (sel.length >= MAX) return;
    const libre = SERIE.slice(0, MAX).find((c) => !sel.some((s) => colores[s] === c)) ?? SERIE[0];
    setColores({ ...colores, [slug]: libre });
    setSel([...sel, slug]);
  };

  const filas = useMemo(() => {
    if (!anual) return [];
    const porAnio = new Map<number, Record<string, number | string | boolean>>();
    for (const r of anual) {
      if (!sel.includes(r.categoria_slug)) continue;
      const fila = porAnio.get(r.anio) ?? { anio: r.anio };
      // Años parciales: en índice se usa ene–oct (comparable); en cantidad/tasa se marcan.
      const v = modo === "indice" ? r.indice_2010 : modo === "tasa" ? r.tasa_100k : r.cantidad;
      fila[r.categoria_slug] = v ?? NaN;
      if (!r.anio_completo) fila[`${r.categoria_slug}__parcial`] = r.meses;
      porAnio.set(r.anio, fila);
    }
    return [...porAnio.values()].sort((a, b) => (a.anio as number) - (b.anio as number));
  }, [anual, sel, modo]);

  if (!anual) return <Cargando />;
  const fmt = modo === "indice" ? dec : modo === "tasa" ? dec : num;
  const ultimo = filas.at(-1);

  return (
    <div>
      <div className="controls">
        <Seg<Modo> label="Medida" value={modo} onChange={setModo}
          options={[["indice", "Índice 2010 = 100"], ["tasa", "Tasa por 100 mil"], ["cantidad", "Casos"]]} />
      </div>
      <div className="controls" role="group" aria-label={`Series (máximo ${MAX})`}>
        {opciones.map((c) => (
          <button key={c.categoria_slug} type="button" className="chip" aria-pressed={sel.includes(c.categoria_slug)}
            onClick={() => toggle(c.categoria_slug)} disabled={!sel.includes(c.categoria_slug) && sel.length >= MAX}>
            {sel.includes(c.categoria_slug) && <span className="dot" style={{ background: colores[c.categoria_slug] }} />}
            {corto(c.categoria_slug)}
          </button>
        ))}
      </div>
      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <LineChart data={filas} margin={{ top: 10, right: 120, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <ReferenceArea x1={2020} x2={2020} fill="var(--surface-2)" fillOpacity={1} ifOverflow="extendDomain"
              label={{ value: "COVID-19", position: "insideTop", fill: "var(--muted)", fontSize: 11 }} />
            <XAxis dataKey="anio" {...AXIS} />
            <YAxis {...AXIS} axisLine={false} width={56} tickFormatter={(v) => (modo === "cantidad" ? kmil(v) : num(v))} />
            <Tooltip cursor={{ stroke: "var(--axis)" }} content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Tip title={label} rows={payload.map((p) => ({
                  color: p.color as string, label: corto(String(p.dataKey)), value: fmt(p.value as number),
                }))} foot={sel.some((s) => (payload[0].payload as Record<string, unknown>)[`${s}__parcial`])
                  ? (modo === "indice" ? "Año parcial: el índice compara ene–oct." : "Año parcial: no comparable con años completos.") : undefined} />
              ) : null} />
            {sel.map((s) => (
              <Line key={s} dataKey={s} stroke={colores[s]} strokeWidth={2} isAnimationActive={false} connectNulls={false}
                dot={(p) => {
                  const parcial = (p.payload as Record<string, unknown>)[`${s}__parcial`];
                  return <circle key={`${s}-${p.index}`} cx={p.cx} cy={p.cy} r={parcial ? 4 : 0}
                    fill="var(--surface)" stroke={colores[s]} strokeWidth={2} />;
                }}
                activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                label={(p) => p.index === filas.length - 1 && ultimo?.[s] != null
                  ? <text x={(p.x as number) + 8} y={p.y as number} dy={4} fontSize={12} fill="var(--ink-2)">{corto(s)}</text>
                  : <g />} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Círculo hueco = año con meses faltantes en la fuente. En modo índice todas las series se comparan
        sobre enero–octubre para que los años parciales sean comparables. 2018 no tiene archivo de homicidios ni extorsión.</p>
    </div>
  );
}
