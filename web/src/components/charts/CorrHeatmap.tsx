import { useState } from "react";
import { type Estadistica, corto, useData } from "@/lib/data";
import { dec } from "@/lib/format";
import { Cargando } from "./Tip";

/** Matriz ρ de Spearman (divergente azul–gris–rojo), ordenada por clúster jerárquico. */
export default function CorrHeatmap() {
  const est = useData<Estadistica>("estadistica");
  const [h, setH] = useState<{ a: string; b: string; rho: number } | null>(null);
  if (!est) return <Cargando />;
  const { orden, celdas, ventana } = est.correlaciones;
  const n = orden.length, C = 26, L = 150;
  const rho = (a: string, b: string) => celdas.find((c) => c.a === a && c.b === b)?.rho ?? 0;
  // Interpolación en la rampa divergente vía color-mix: el gris neutro es el 0.
  const color = (r: number) => {
    const t = Math.min(1, Math.abs(r)) * 100;
    return `color-mix(in oklab, ${r < 0 ? "var(--div-neg)" : "var(--div-pos)"} ${t.toFixed(0)}%, var(--div-mid))`;
  };

  return (
    <div>
      <div className="table-scroll">
        <svg viewBox={`0 0 ${L + n * C} ${L + n * C}`} style={{ width: "100%", maxWidth: 640, display: "block" }} role="img"
          aria-label="Matriz de correlación de Spearman entre tasas departamentales de delitos" onMouseLeave={() => setH(null)}>
          {orden.map((s, i) => (
            <g key={s}>
              <text x={L - 6} y={L + i * C + C / 2 + 4} textAnchor="end" fontSize={11} fill="var(--ink-2)">{corto(s)}</text>
              <text transform={`translate(${L + i * C + C / 2 + 4},${L - 6}) rotate(-60)`} fontSize={11} fill="var(--ink-2)">{corto(s)}</text>
            </g>
          ))}
          {orden.map((a, i) => orden.map((b, j) => {
            const r = rho(a, b);
            return <rect key={a + b} x={L + j * C + 1} y={L + i * C + 1} width={C - 2} height={C - 2} rx={3} fill={color(r)}
              stroke={h && ((h.a === a && h.b === b)) ? "var(--ink)" : "none"} onMouseEnter={() => setH({ a, b, rho: r })} />;
          }))}
        </svg>
      </div>
      <p className="note">
        {h ? <><b>{corto(h.a)}</b> × <b>{corto(h.b)}</b>: ρ = {dec(h.rho)}</> : "Pasa el cursor por una celda."}
        {" "}Rojo = los departamentos con más de uno tienden a tener más del otro; azul = relación inversa; gris ≈ 0.
        Tasas por 100 mil, promedio {ventana[0]}–{ventana[1]}, 33 departamentos.
      </p>
    </div>
  );
}
