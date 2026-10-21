import { useMemo } from "react";
import { type Estadistica, corto, departamentos, useData } from "@/lib/data";
import { type GeoFC, proyectar } from "@/lib/geo";
import { dec } from "@/lib/format";
import { Cargando } from "./Tip";

/** Nombre derivado del propio clúster (la numeración cambia si se re-ejecuta el pipeline). */
const titulo = (r: { altos: string[]; z: Record<string, number> }) => {
  const media = Object.values(r.z).reduce((a, b) => a + b, 0) / Object.values(r.z).length;
  const nivel = media > 0.3 ? "Incidencia alta" : media < -0.3 ? "Incidencia baja" : "Incidencia media";
  return `${nivel}; destacan ${r.altos.slice(0, 2).map(corto).join(" y ").toLowerCase()}`;
};

/** Clúster jerárquico (Ward) en facetas: un mapa por grupo con un solo color
 *  (evita >3 categorías simultáneas en un mapa, que no son distinguibles). */
export default function Tipologias() {
  const geo = useData<GeoFC>("departamentos.geo");
  const est = useData<Estadistica>("estadistica");
  const proy = useMemo(() => (geo ? proyectar(geo, 200, 250) : null), [geo]);
  if (!geo || !est || !proy) return <Cargando />;
  const grupoDe = (cod: string) => {
    const n = departamentos.find((d) => d.cod_dpto === cod)?.departamento;
    return est.tipologias.departamentos.find((d) => d.departamento === n)?.grupo;
  };

  return (
    <div className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))" }}>
      {Object.entries(est.tipologias.rasgos).map(([g, r]) => {
        const miembros = est.tipologias.departamentos.filter((d) => String(d.grupo) === g).map((d) => d.departamento);
        return (
          <div className="card" key={g}>
            <span className="badge">Grupo {g} · {miembros.length} deptos.</span>
            <h3 style={{ marginTop: 8 }}>{titulo(r)}</h3>
            <svg viewBox="0 0 200 250" style={{ width: "100%", maxWidth: 220, display: "block", margin: "0 auto" }} role="img"
              aria-label={`Departamentos del grupo ${g}: ${miembros.join(", ")}`}>
              {proy.continental.features.map((f) => (
                <path key={f.properties.cod_dpto} d={proy.path(f as never) ?? ""} stroke="var(--surface)" strokeWidth={0.6}
                  fill={String(grupoDe(f.properties.cod_dpto)) === g ? "var(--s1)" : "var(--grid)"} />
              ))}
            </svg>
            <p className="sub" style={{ marginTop: 8 }}>
              <b>Por encima de la media:</b> {r.altos.map((s) => `${corto(s)} (z ${dec(r.z[s])})`).join(", ")}<br />
              <b>Por debajo:</b> {r.bajos.map(corto).join(", ")}
            </p>
            <details><summary>Departamentos</summary><p className="note">{miembros.join(" · ")}</p></details>
          </div>
        );
      })}
    </div>
  );
}
