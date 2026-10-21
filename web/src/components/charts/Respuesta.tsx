import { useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { type Clase, type Estadistica, type Recuperacion, useData } from "@/lib/data";
import { SERIE } from "@/lib/color";
import { dec, kmil, num, pct, ton } from "@/lib/format";
import { AXIS, Cargando, Tip } from "./Tip";

const DROGAS = ["Marihuana", "Cocaina", "Base de coca", "Basuco", "Heroina"];

/** Incautación de estupefacientes por tipo, en toneladas (área apilada). */
export function DrogaTipos() {
  const clases = useData<Clase[]>("clases");
  const filas = useMemo(() => {
    if (!clases) return [];
    const m = new Map<number, Record<string, number>>();
    for (const c of clases) {
      if (c.categoria_slug !== "droga") continue;
      const f = m.get(c.anio) ?? { anio: c.anio };
      const k = DROGAS.includes(c.clase_bien) ? c.clase_bien : "Otras";
      f[k] = (f[k] ?? 0) + c.cantidad / 1e6;
      m.set(c.anio, f);
    }
    return [...m.values()].sort((a, b) => a.anio - b.anio);
  }, [clases]);
  if (!clases) return <Cargando />;
  return (
    <>
      <Leyenda items={DROGAS.map((d, i) => [d === "Cocaina" ? "Cocaína" : d === "Heroina" ? "Heroína" : d, SERIE[i]])} />
      <div style={{ height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={filas} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="anio" {...AXIS} />
            <YAxis {...AXIS} axisLine={false} width={48} tickFormatter={(v) => `${num(v)} t`} />
            <Tooltip cursor={{ stroke: "var(--axis)" }} content={({ active, payload, label }) => active && payload?.length ? (
              <Tip title={label} rows={[...payload].reverse().map((p) => ({ color: p.color as string, label: String(p.dataKey), value: ton((p.value as number) * 1e6) }))} />
            ) : null} />
            {DROGAS.map((d, i) => (
              <Area key={d} dataKey={d} stackId="1" stroke="var(--surface)" strokeWidth={1.5} fill={SERIE[i]} fillOpacity={0.9} isAnimationActive={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Toneladas (gramos/10⁶). 2022 no tiene archivo de estupefacientes en la fuente; 2023 llega hasta octubre.</p>
    </>
  );
}

/** Armas incautadas por clase (total del periodo). */
export function ArmasClase() {
  const clases = useData<Clase[]>("clases");
  if (!clases) return <Cargando />;
  const acc = new Map<string, number>();
  for (const c of clases) if (c.categoria_slug === "armas") acc.set(c.clase_bien, (acc.get(c.clase_bien) ?? 0) + c.cantidad);
  const filas = [...acc.entries()].map(([clase, cantidad]) => ({ clase, cantidad })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8);
  return (
    <div style={{ height: filas.length * 28 + 20 }}>
      <ResponsiveContainer>
        <BarChart data={filas} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }} barCategoryGap={4}>
          <XAxis type="number" hide />
          <YAxis type="category" interval={0} dataKey="clase" {...AXIS} width={130} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload }) => active && payload?.length ? (
            <Tip title={(payload[0].payload as { clase: string }).clase} rows={[{ label: "Armas", value: num(payload[0].value as number) }]} />
          ) : null} />
          <Bar dataKey="cantidad" fill="var(--s7)" radius={4} isAnimationActive={false}
            label={{ position: "right", fill: "var(--ink-2)", fontSize: 11, formatter: (v: unknown) => kmil(v as number) }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Capturas por delito imputado (top 8 del último año completo vs. 2010). */
export function CapturasDelito() {
  const datos = useData<{ articulo: string; subtipo: string; anio: number; cantidad: number }[]>("capturas_delito");
  if (!datos) return <Cargando />;
  const acc = new Map<string, number>();
  for (const d of datos) if (d.anio >= 2019 && d.anio <= 2022) acc.set(d.subtipo, (acc.get(d.subtipo) ?? 0) + d.cantidad);
  const filas = [...acc.entries()].map(([s, c]) => ({ s: s.length > 40 ? s.slice(0, 38) + "…" : s, completo: s, c: c / 4 }))
    .sort((a, b) => b.c - a.c).slice(0, 10);
  return (
    <>
      <div style={{ height: filas.length * 28 + 20 }}>
        <ResponsiveContainer>
          <BarChart data={filas} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }} barCategoryGap={4}>
            <XAxis type="number" hide />
            <YAxis type="category" interval={0} dataKey="s" {...AXIS} width={240} axisLine={false} tick={{ fill: "var(--ink-2)", fontSize: 11 }} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload }) => active && payload?.length ? (
              <Tip title={(payload[0].payload as { completo: string }).completo} rows={[{ label: "Capturas/año (prom. 2019–22)", value: num(payload[0].value as number) }]} />
            ) : null} />
            <Bar dataKey="c" fill="var(--s7)" radius={4} isAnimationActive={false}
              label={{ position: "right", fill: "var(--ink-2)", fontSize: 11, formatter: (v: unknown) => kmil(v as number) }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Promedio anual 2019–2022 por delito imputado al capturado.</p>
    </>
  );
}

/** Tasa de recuperación nacional: recuperados / hurtados del mismo año. */
export function RecuperacionChart() {
  const rec = useData<Recuperacion[]>("recuperacion");
  if (!rec) return <Cargando />;
  const m = new Map<number, Record<string, number>>();
  for (const r of rec) {
    if (r.nivel !== "nacional") continue;
    const f = m.get(r.anio) ?? { anio: r.anio };
    f[r.bien] = r.tasa_recuperacion_pct;
    f[`${r.bien}__r`] = r.recuperados; f[`${r.bien}__h`] = r.hurtados;
    m.set(r.anio, f);
  }
  const filas = [...m.values()].sort((a, b) => a.anio - b.anio);
  const nombre: Record<string, string> = { motos: "Motocicletas", vehiculos: "Vehículos" };
  return (
    <>
      <Leyenda items={[["Motocicletas", SERIE[0]], ["Vehículos", SERIE[1]]]} />
      <div style={{ height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={filas} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="anio" {...AXIS} />
            <YAxis {...AXIS} axisLine={false} width={44} domain={[0, 80]} tickFormatter={(v) => `${v} %`} />
            <Tooltip cursor={{ stroke: "var(--axis)" }} content={({ active, payload, label }) => active && payload?.length ? (
              <Tip title={label} rows={payload.map((p) => {
                const f = p.payload as Record<string, number>;
                return { color: p.color as string, label: nombre[String(p.dataKey)],
                  value: `${pct(p.value as number)} (${num(f[`${p.dataKey}__r`])} / ${num(f[`${p.dataKey}__h`])})` };
              })} />
            ) : null} />
            {["motos", "vehiculos"].map((b, i) => (
              <Line key={b} dataKey={b} stroke={SERIE[i]} strokeWidth={2} dot={{ r: 3, fill: SERIE[i] }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Indicador de flujo: lo recuperado en un año puede venir de hurtos anteriores. 2023 es parcial (ene–oct/sep).</p>
    </>
  );
}

/** Dispersión depto: capturas vs. delitos por 100 mil (una sola serie). */
export function ScatterRespuesta() {
  const est = useData<Estadistica>("estadistica");
  if (!est) return <Cargando />;
  const { puntos, rho } = est.respuesta;
  const top = new Set([...puntos].sort((a, b) => b.delitos_100k - a.delitos_100k).slice(0, 4).map((p) => p.departamento));
  return (
    <>
      <p className="sub">ρ de Spearman = <b>{dec(rho)}</b> — donde se registran más delitos, también se captura más.</p>
      <div style={{ height: 320 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 10, right: 24, left: 0, bottom: 16 }}>
            <CartesianGrid />
            <XAxis type="number" dataKey="delitos_100k" name="Delitos" {...AXIS} tickFormatter={kmil}
              label={{ value: "Delitos por 100 mil", position: "insideBottom", offset: -8, fill: "var(--muted)", fontSize: 11 }} />
            <YAxis type="number" dataKey="capturas_100k" name="Capturas" {...AXIS} width={48} tickFormatter={kmil}
              label={{ value: "Capturas por 100 mil", angle: -90, position: "insideLeft", fill: "var(--muted)", fontSize: 11 }} />
            <ZAxis range={[70, 70]} />
            <Tooltip content={({ active, payload }) => active && payload?.length ? (
              <Tip title={(payload[0].payload as { departamento: string }).departamento} rows={[
                { label: "Delitos /100 mil", value: num((payload[0].payload as { delitos_100k: number }).delitos_100k) },
                { label: "Capturas /100 mil", value: num((payload[0].payload as { capturas_100k: number }).capturas_100k) }]} />
            ) : null} />
            <Scatter data={puntos} fill="var(--s1)" stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}
              label={{ dataKey: "departamento", position: "top", fontSize: 10, fill: "var(--ink-2)",
                formatter: (v: unknown) => (top.has(v as string) ? (v as string) : "") }} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Promedio 2015–2019. La relación refleja también capacidad de denuncia y presencia policial.</p>
    </>
  );
}

function Leyenda({ items }: { items: [string, string][] }) {
  return <div className="controls">{items.map(([l, c]) => <span key={l} className="chip" style={{ cursor: "default" }}><span className="dot" style={{ background: c }} />{l}</span>)}</div>;
}
