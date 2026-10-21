"""PASO 06 — Publicar: contrato de datos para la web (JSON compacto).

  web/public/data/*.json   → datasets que las islas cargan bajo demanda
  web/src/data/*.json      → resumen pequeño importado en build (textos, KPIs)

Cada JSON lleva sólo las columnas que consume la web. El contrato está
documentado en docs/03-diccionario-datos.md.
"""

from __future__ import annotations

import json

import pandas as pd
from shapely.geometry import mapping, shape

from ..config import GOLD, REFS, REPORTS, WEB_DATA, WEB_PUBLIC_DATA
from ..utils import get_logger, records, write_json

log = get_logger("06_publicar")


def _pub(nombre: str, data) -> None:
    write_json(WEB_PUBLIC_DATA / f"{nombre}.json", data)
    kb = (WEB_PUBLIC_DATA / f"{nombre}.json").stat().st_size / 1024
    log.info(f"public/data/{nombre}.json · {kb:,.0f} KB")


def geometria() -> None:
    gj = json.loads((REFS / "colombia_departamentos.geo.json").read_text())
    feats = []
    for f in gj["features"]:
        geom = shape(f["geometry"]).simplify(0.01, preserve_topology=True)
        g = json.loads(json.dumps(mapping(geom)), parse_float=lambda x: round(float(x), 3))
        feats.append({"type": "Feature", "properties": {"cod_dpto": f["properties"]["DPTO"]}, "geometry": g})
    _pub("departamentos.geo", {"type": "FeatureCollection", "features": feats})


def insights(cat: pd.DataFrame, anual: pd.DataFrame, est: dict, calidad: dict) -> dict:
    """Cifras clave para el storytelling (todas calculadas, ninguna escrita a mano)."""
    d = anual[anual.dominio == "delitos"]
    total = float(d.cantidad.sum())
    completos = d[d.anio_completo]
    por_anio = d.groupby("anio")["cantidad_ene_oct"].sum()
    tend = {t["categoria_slug"]: t for t in est["tendencias"]}
    covid = {c["categoria_slug"]: c for c in est["covid"]}
    conc = {c["categoria_slug"]: c for c in est["concentracion"]}
    est_m = {e["categoria_slug"]: e for e in est["estacionalidad"]}
    dia = {e["categoria_slug"]: e for e in est["dia_semana"]}
    crecen = sorted([t for t in est["tendencias"] if t["direccion"] == "creciente" and t["categoria_slug"] in set(d.categoria_slug)],
                    key=lambda t: -t["tcac_pct"])
    hom = d[(d.categoria_slug == "homicidios") & d.anio_completo].set_index("anio")
    return {
        "periodo": [int(d.anio.min()), int(d.anio.max())],
        "delitos_total": total,
        "delitos_categorias": int(d.categoria_slug.nunique()),
        "filas_procesadas": int(calidad["controles"]["delitos"]["filas"] + calidad["controles"]["operativos"]["filas"]),
        "archivos_conciliados": sum(calidad["controles"][k]["C1_conciliacion"]["archivos_conciliados"] for k in ("delitos", "operativos")),
        "ene_oct_por_anio": {int(k): float(v) for k, v in por_anio.items()},
        "mas_frecuente": cat[cat.dominio == "delitos"].sort_values("cantidad").iloc[-1][["categoria_slug", "categoria", "cantidad"]].to_dict(),
        "crecen_mas": [{"categoria_slug": t["categoria_slug"], "tcac_pct": t["tcac_pct"], "desde": t["desde"], "hasta": t["hasta"]} for t in crecen[:4]],
        "homicidios_tasa": {int(a): float(r.tasa_100k) for a, r in hom.iterrows()},
        "covid": covid,
        "concentracion_hurto_personas": {k: conc["hurto-personas"][k] for k in ("gini", "top10_pct")},
        "estacionalidad_vif": est_m.get("violencia-intrafamiliar"),
        "fin_de_semana_homicidios_pct": dia["homicidios"]["fin_de_semana_pct"],
        "fin_de_semana_lesiones_pct": dia["lesiones-personales"]["fin_de_semana_pct"],
        "respuesta_rho": est["respuesta"]["rho"],
        "tendencias": tend,
        "anios_completos_ultimo": int(completos.anio.max()),
    }


def run() -> None:
    WEB_PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    g = {n: pd.read_parquet(GOLD / f"{n}.parquet") for n in
         ("catalogo", "serie_anual", "serie_mensual", "depto_anual", "municipio_anual", "perfiles",
          "temporal_fino", "subtipos", "clases_bien", "recuperacion", "cobertura")}
    est = json.loads((GOLD / "estadistica.json").read_text())
    calidad = json.loads((REPORTS / "calidad.json").read_text())
    inventario = json.loads((REPORTS / "inventario.json").read_text())

    cat = g["catalogo"]
    _pub("anual", records(g["serie_anual"].drop(columns=["poblacion"]), 2))
    m = g["serie_mensual"]
    _pub("mensual", {slug: [[int(r.anio), int(r.mes), float(r.cantidad)] for r in grp.itertuples()]
                     for slug, grp in m.groupby("categoria_slug")})
    # {slug: [[cod_dpto, anio, cantidad, tasa_100k], …]} — ~4× más liviano que registros
    _pub("depto", {slug: [[r.cod_dpto, int(r.anio), float(r.cantidad), round(float(r.tasa_100k), 2)]
                          for r in grp.itertuples()]
                   for slug, grp in g["depto_anual"].groupby("categoria_slug")})
    mp = g["municipio_anual"]
    top = (mp.groupby(["categoria_slug", "cod_mpio", "municipio", "departamento"])["cantidad"].sum()
           .reset_index().sort_values("cantidad", ascending=False).groupby("categoria_slug").head(40))
    _pub("municipios_top", records(top, 2))
    _pub("perfiles", records(g["perfiles"].drop(columns="dominio"), 2))
    _pub("temporal", records(g["temporal_fino"].drop(columns="dominio"), 2))
    st = g["subtipos"]
    st["subtipo"] = st["subtipo"].astype(str)
    _pub("subtipos", records(st[st.categoria_slug != "capturas"].drop(columns="dominio"), 2))
    cap = (st[st.categoria_slug == "capturas"].groupby(["articulo", "subtipo", "anio"])["cantidad"].sum().reset_index())
    top_art = cap.groupby("subtipo")["cantidad"].sum().nlargest(15).index
    _pub("capturas_delito", records(cap[cap.subtipo.isin(top_art)], 2))
    cb = g["clases_bien"]
    cb["clase_bien"] = cb["clase_bien"].astype(str).str.replace("_", " ")
    _pub("clases", records(cb.drop(columns="dominio"), 2))
    _pub("recuperacion", records(g["recuperacion"], 2))
    _pub("estadistica", est)
    _pub("calidad", {
        "cobertura": records(g["cobertura"][["dominio", "categoria_slug", "anio", "meses", "anio_completo"]]),
        "controles": {d: {k: v for k, v in c.items() if k != "C3_completitud"} | {"C3_completitud": c["C3_completitud"]}
                      for d, c in calidad["controles"].items()},
        "inventario": {k: inventario[k] for k in ("archivos", "hojas", "hojas_sin_encabezado", "relocalizados",
                                                   "varios_archivos_mismo_anio", "huecos_cobertura")},
        "bitacora": calidad["bitacora_silver"],
    })
    geometria()

    write_json(WEB_DATA / "catalogo.json", records(cat), pretty=True)
    write_json(WEB_DATA / "insights.json", insights(cat, g["serie_anual"], est, calidad), pretty=True)
    write_json(WEB_DATA / "departamentos.json",
               records(pd.read_parquet(GOLD / "poblacion.parquet").query("anio == 2023")[["cod_dpto", "departamento", "region", "poblacion"]]),
               pretty=True)
    log.info("✓ contrato de datos publicado en web/")


if __name__ == "__main__":
    run()
