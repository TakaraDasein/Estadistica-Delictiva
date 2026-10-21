import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type Perfil, corto, useData } from "@/lib/data";
import { SERIE } from "@/lib/color";
import { num, pct } from "@/lib/format";
import { AXIS, Cargando, Seg, Tip } from "./Tip";

type Dim = "genero" | "grupo_edad" | "arma_grupo";
const ORDEN: Record<Dim, string[]> = {
  genero: ["Femenino", "Masculino", "No reporta"],
  grupo_edad: ["Menores", "Adolescentes", "Adultos", "No reporta"],
  arma_grupo: ["Sin empleo de armas", "Contundente", "Arma blanca / cortopunzante", "Arma de fuego", "Otros"],
};
const TITULO: Record<Dim, string> = { genero: "Género de la víctima", grupo_edad: "Grupo de edad", arma_grupo: "Arma o medio" };
// "No reporta" y "Otros" van en gris neutro: no compiten con las categorías con significado.
const NEUTRO = new Set(["No reporta", "Otros"]);

/** Composición 100 % apilada por delito: ¿quién es la víctima y con qué medio? */
export default function PerfilBarras({ inicial = "genero", soloSlug }: { inicial?: Dim; soloSlug?: string }) {
  const perfiles = useData<Perfil[]>("perfiles");
  const [dim, setDim] = useState<Dim>(inicial);
  const [ultimos, setUltimos] = useState(false);

  const { filas, claves } = useMemo(() => {
    if (!perfiles) return { filas: [], claves: [] };
    const claves = ORDEN[dim];
    const acc = new Map<string, Record<string, number>>();
    for (const p of perfiles) {
      if (p.dimension !== dim || (soloSlug && p.categoria_slug !== soloSlug) || (ultimos && p.anio < 2022)) continue;
      const k = claves.includes(p.valor) ? p.valor : dim === "arma_grupo" ? (p.valor === "No reporta" ? "Otros" : "Otros") : p.valor;
      const f = acc.get(p.categoria_slug) ?? {};
      f[k] = (f[k] ?? 0) + p.cantidad;
      acc.set(p.categoria_slug, f);
    }
    const filas = [...acc.entries()].map(([slug, f]) => {
      const tot = Object.values(f).reduce((a, b) => a + b, 0);
      const out: Record<string, number | string> = { slug, nombre: corto(slug), total: tot };
      for (const k of claves) { out[k] = ((f[k] ?? 0) / tot) * 100; out[`${k}__n`] = f[k] ?? 0; }
      return out;
    }).filter((f) => (f.total as number) > 0)
      .sort((a, b) => (b[claves[0]] as number) - (a[claves[0]] as number));
    return { filas, claves };
  }, [perfiles, dim, ultimos, soloSlug]);

  if (!perfiles) return <Cargando />;
  let slot = 0;
  const color = Object.fromEntries(claves.map((k) => [k, NEUTRO.has(k) ? "var(--axis)" : SERIE[slot++]]));

  return (
    <div>
      {!soloSlug && (
        <div className="controls">
          <Seg<Dim> label="Dimensión" value={dim} onChange={setDim}
            options={[["genero", "Género"], ["grupo_edad", "Edad"], ["arma_grupo", "Arma / medio"]]} />
          <Seg<"t" | "u"> label="Periodo" value={ultimos ? "u" : "t"} onChange={(v) => setUltimos(v === "u")}
            options={[["t", "2010–2024"], ["u", "2022–2024"]]} />
        </div>
      )}
      <div className="controls" aria-label={`Leyenda: ${TITULO[dim]}`}>
        {claves.map((k) => <span key={k} className="chip" style={{ cursor: "default" }}><span className="dot" style={{ background: color[k] }} />{k}</span>)}
      </div>
      <div style={{ height: filas.length * 28 + 40 }}>
        <ResponsiveContainer>
          <BarChart data={filas} layout="vertical" stackOffset="expand" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barCategoryGap={5}>
            <XAxis type="number" {...AXIS} tickFormatter={(v) => `${Math.round(v * 100)} %`} />
            <YAxis type="category" interval={0} dataKey="nombre" {...AXIS} width={140} axisLine={false} />
            <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload, label }) => active && payload?.length ? (
              <Tip title={label} rows={payload.map((p) => ({ color: p.color as string, label: String(p.dataKey),
                value: `${pct(p.value as number)} · ${num((p.payload as Record<string, number>)[`${p.dataKey}__n`])}` }))} />
            ) : null} />
            {claves.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="a" fill={color[k]} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}
                radius={i === claves.length - 1 ? [0, 4, 4, 0] : i === 0 ? [4, 0, 0, 4] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="note">Sólo delitos cuya fuente registra la dimensión. Ordenado por la primera categoría ({claves[0]}).</p>
    </div>
  );
}
