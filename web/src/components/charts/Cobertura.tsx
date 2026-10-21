import { corto, useData } from "@/lib/data";
import { Cargando } from "./Tip";

interface Calidad { cobertura: { dominio: string; categoria_slug: string; anio: number; meses: number; anio_completo: boolean }[] }
const ANIOS = Array.from({ length: 15 }, (_, i) => 2010 + i);

/** Matriz de cobertura categoría × año. Estado con símbolo + color (nunca sólo color). */
export default function Cobertura() {
  const cal = useData<Calidad>("calidad");
  if (!cal) return <Cargando />;
  const cats = [...new Set(cal.cobertura.map((c) => c.categoria_slug))];
  const celda = (s: string, a: number) => cal.cobertura.find((c) => c.categoria_slug === s && c.anio === a);
  return (
    <div className="table-scroll">
      <table style={{ minWidth: 760 }}>
        <thead><tr><th>Serie</th>{ANIOS.map((a) => <th key={a} className="n">{String(a).slice(2)}</th>)}</tr></thead>
        <tbody>
          {cats.map((s) => (
            <tr key={s}>
              <td style={{ whiteSpace: "nowrap" }}>{corto(s)}</td>
              {ANIOS.map((a) => {
                const c = celda(s, a);
                const [bg, sym, t] = !c ? ["var(--surface-2)", "×", "sin archivo"] : c.anio_completo ? ["color-mix(in srgb, var(--good) 22%, transparent)", "✓", "12 meses"]
                  : ["color-mix(in srgb, var(--warning) 30%, transparent)", String(c.meses), `${c.meses} meses (parcial)`];
                return <td key={a} className="n" title={`${corto(s)} ${a}: ${t}`} style={{ background: bg, textAlign: "center", fontSize: ".75rem" }}>{sym}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">✓ año completo · número = meses con datos (parcial) · × sin archivo en la fuente.</p>
    </div>
  );
}
