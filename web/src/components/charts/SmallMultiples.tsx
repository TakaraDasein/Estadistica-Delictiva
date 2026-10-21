import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { type Anual, type Estadistica, corto, delitos, operativos, useData } from "@/lib/data";
import { num, pct } from "@/lib/format";
import { Cargando, Tip } from "./Tip";

const FLECHA: Record<string, string> = { creciente: "▲", decreciente: "▼", "sin tendencia": "—" };

/** Un panel por categoría con escala propia: compara FORMA, no magnitud. */
export default function SmallMultiples({ dominio = "delitos" }: { dominio?: "delitos" | "operativos" }) {
  const anual = useData<Anual[]>("anual");
  const est = useData<Estadistica>("estadistica");
  if (!anual || !est) return <Cargando />;
  const lista = dominio === "delitos" ? delitos : operativos;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="grid-3">
      {lista.map((c) => {
        const serie = anual.filter((r) => r.categoria_slug === c.categoria_slug);
        const t = est.tendencias.find((x) => x.categoria_slug === c.categoria_slug);
        return (
          <a key={c.categoria_slug} href={`${base}/delito/${c.categoria_slug}`} className="card" style={{ textDecoration: "none", padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ color: "var(--ink)" }}>{corto(c.categoria_slug)}</h3>
              {t && <span className="badge" title={`Mann-Kendall τ=${t.tau.toFixed(2)}, p=${t.p_valor.toFixed(3)}`}>
                {FLECHA[t.direccion]} {t.direccion}</span>}
            </div>
            <p className="sub" style={{ margin: 0 }}>
              {num(c.cantidad)} casos · TCAC {t ? pct(t.tcac_pct, true) : "—"}
            </p>
            <div style={{ height: 70 }}>
              <ResponsiveContainer>
                <AreaChart data={serie} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip cursor={{ stroke: "var(--axis)" }} content={({ active, payload }) => active && payload?.length ? (
                    <Tip title={(payload[0].payload as Anual).anio} rows={[{ label: "Casos", value: num(payload[0].value as number) }]}
                      foot={(payload[0].payload as Anual).anio_completo ? undefined : `Parcial: ${(payload[0].payload as Anual).meses} meses`} />
                  ) : null} />
                  <Area dataKey="cantidad" stroke="var(--s1)" strokeWidth={2} fill="var(--s1)" fillOpacity={0.12} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </a>
        );
      })}
    </div>
  );
}
