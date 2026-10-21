import { useMemo, useState } from "react";
import { type Depto, corto, delitos, nombreDepto, operativos, useData } from "@/lib/data";
import { rampaSeq } from "@/lib/color";
import { geoMercator, geoPath } from "d3-geo";
import { aniosDisponibles, type GeoFC, ISLA, proyectar, valoresDepto } from "@/lib/geo";
import { dec, num } from "@/lib/format";
import { Cargando, Seg, Tip } from "./Tip";

type Medida = "tasa" | "cantidad";
const W = 420, H = 520;

/** Coropleta departamental (D3-geo) + ranking enlazado. Tasa por 100 mil por defecto:
 *  los conteos absolutos sólo repiten el mapa de población. */
export default function MapaCoropletico({ inicial = "homicidios", fijo = false }: { inicial?: string; fijo?: boolean }) {
  const geo = useData<GeoFC>("departamentos.geo");
  const depto = useData<Depto>("depto");
  const [slug, setSlug] = useState(inicial);
  const [medida, setMedida] = useState<Medida>("tasa");
  const [anioSel, setAnio] = useState<number | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const anios = useMemo(() => (depto ? aniosDisponibles(depto, slug) : []), [depto, slug]);
  const anio = anioSel && anios.includes(anioSel) ? anioSel : anios.at(-1) ?? 2023;
  const proy = useMemo(() => (geo ? proyectar(geo, W, H) : null), [geo]);

  if (!geo || !depto || !proy) return <Cargando />;
  const vals = valoresDepto(depto, slug, anio);
  const v = (cod: string) => (medida === "tasa" ? vals[cod]?.tasa : vals[cod]?.cantidad);
  const color = rampaSeq(Object.keys(vals).map(v) as number[]);
  const fmt = medida === "tasa" ? dec : num;
  const ranking = Object.keys(vals).sort((a, b) => (v(b) ?? 0) - (v(a) ?? 0));
  const max = v(ranking[0]) ?? 1;
  const isla = geo.features.find((f) => f.properties.cod_dpto === ISLA);
  const islaPath = isla ? geoPath(geoMercator().fitSize([40, 60], isla as never))(isla as never) : null;

  return (
    <div>
      <div className="controls">
        {!fijo && (
          <select aria-label="Categoría" value={slug} onChange={(e) => setSlug(e.target.value)}>
            <optgroup label="Delitos">{delitos.map((c) => <option key={c.categoria_slug} value={c.categoria_slug}>{corto(c.categoria_slug)}</option>)}</optgroup>
            <optgroup label="Operativos">{operativos.map((c) => <option key={c.categoria_slug} value={c.categoria_slug}>{corto(c.categoria_slug)}</option>)}</optgroup>
          </select>
        )}
        <select aria-label="Año" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <Seg<Medida> label="Medida" value={medida} onChange={setMedida} options={[["tasa", "Por 100 mil hab."], ["cantidad", "Casos"]]} />
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div style={{ position: "relative" }} onMouseLeave={() => { setHover(null); setPos(null); }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} role="img"
            aria-label={`Mapa de ${corto(slug)} por departamento, ${anio}`}
            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: e.clientX - r.left, y: e.clientY - r.top }); }}>
            {proy.continental.features.map((f) => {
              const cod = f.properties.cod_dpto;
              return <path key={cod} d={proy.path(f as never) ?? ""} fill={color(v(cod))}
                stroke={hover === cod ? "var(--ink)" : "var(--surface)"} strokeWidth={hover === cod ? 1.5 : 0.8}
                onMouseEnter={() => setHover(cod)} style={{ cursor: "pointer" }} />;
            })}
            {islaPath && (
              <g transform="translate(14,14)" onMouseEnter={() => setHover(ISLA)}>
                <rect width={48} height={68} rx={6} fill="none" stroke="var(--border)" />
                <path d={islaPath} transform="translate(4,4)" fill={color(v(ISLA))} stroke="var(--ink-2)" strokeWidth={0.6} />
                <text x={24} y={80} fontSize={9} textAnchor="middle" fill="var(--muted)">San Andrés</text>
              </g>
            )}
          </svg>
          {hover && pos && (
            <div style={{ position: "absolute", left: Math.min(pos.x + 12, W - 160), top: pos.y + 12 }}>
              <Tip title={nombreDepto(hover)} rows={[
                { label: "Tasa por 100 mil", value: dec(vals[hover]?.tasa) },
                { label: "Casos", value: num(vals[hover]?.cantidad) },
                { label: "Puesto", value: `${ranking.indexOf(hover) + 1} de ${ranking.length}` },
              ]} />
            </div>
          )}
          <Leyenda valores={ranking.map((c) => v(c) as number)} fmt={fmt} />
        </div>
        <div>
          <h3>Ranking {anio}</h3>
          <div style={{ display: "grid", gap: 2 }}>
            {ranking.map((cod, i) => (
              <div key={cod} onMouseEnter={() => setHover(cod)} onMouseLeave={() => setHover(null)}
                style={{ display: "grid", gridTemplateColumns: "22px 1fr 64px", gap: 8, alignItems: "center", fontSize: ".82rem",
                  background: hover === cod ? "var(--surface-2)" : undefined, borderRadius: 4, padding: "1px 4px" }}>
                <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                <span style={{ position: "relative", minWidth: 0 }}>
                  <span style={{ position: "absolute", inset: "2px auto 2px 0", width: `${((v(cod) ?? 0) / max) * 100}%`, background: "var(--s1)", opacity: 0.18, borderRadius: 4 }} />
                  <span style={{ position: "relative", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{nombreDepto(cod)}</span>
                </span>
                <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(v(cod))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Leyenda({ valores, fmt }: { valores: number[]; fmt: (n: number) => string }) {
  const ord = valores.filter(Number.isFinite).sort((a, b) => a - b);
  if (!ord.length) return null;
  const pasos = [100, 200, 300, 400, 500, 600, 700];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".75rem", color: "var(--muted)", marginTop: 6 }}>
      <span>{fmt(ord[0])}</span>
      <span style={{ display: "flex" }}>{pasos.map((p) => <span key={p} style={{ width: 22, height: 10, background: `var(--seq-${p})` }} />)}</span>
      <span>{fmt(ord.at(-1)!)}</span>
      <span>· cuantiles (7)</span>
    </div>
  );
}
