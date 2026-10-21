"""PASO 03 — Calidad: validaciones y metadatos de confiabilidad.

Controles (cada uno con estado ok / aviso / error):
  C1 Conciliación: suma limpia por archivo vs. fila TOTAL declarada en el Excel.
  C2 Cobertura temporal: meses con datos por categoría × año → anio_completo.
  C3 Completitud de dimensiones: % 'No reporta' por categoría.
  C4 Geografía: filas sin departamento (incautaciones en el exterior, etc.).
  C5 Concentración de cola: % de la cantidad en el 1 % de filas más grandes.
  C6 Rango de fechas: hechos fuera del año del archivo.

Salida: data/silver/cobertura.parquet + data/reports/calidad.json
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

from ..config import REPORTS, SILVER
from ..utils import get_logger, write_json

log = get_logger("03_calidad")


def conciliacion(df: pd.DataFrame, bitacora: dict, dominio: str) -> list[dict]:
    declarado = {a: t for k, b in bitacora.items() if k.startswith(f"{dominio}/")
                 for a, t in b.get("total_declarado", {}).items()}
    suma = df.groupby("archivo", observed=True)["cantidad"].sum()
    filas = []
    for archivo, total in declarado.items():
        s = float(suma.get(archivo, 0))
        # Los totales de armas 2010-2018 vienen con '.' de miles (44.563 = 44 563)
        t = min((total, total * 1000), key=lambda x: abs(s - x))
        dif = (s - t) / t if t else np.nan
        filas.append({"archivo": archivo, "suma_limpia": s, "total_declarado": t,
                      "diferencia_pct": round(dif * 100, 3),
                      "estado": "ok" if abs(dif) < 0.005 else "aviso"})
    return filas


def cobertura(df: pd.DataFrame) -> pd.DataFrame:
    v = df[df.fecha_valida]
    cob = (v.groupby(["dominio", "categoria_slug", "anio"], observed=True)
             .agg(meses=("mes", "nunique"), fecha_max=("fecha", "max"), cantidad=("cantidad", "sum"))
             .reset_index())
    cob["anio_completo"] = cob["meses"] == 12
    cob["mes_max"] = cob["fecha_max"].dt.month
    return cob


def completitud(df: pd.DataFrame) -> list[dict]:
    out = []
    for slug, g in df.groupby("categoria_slug", observed=True):
        fila = {"categoria_slug": slug}
        for col in ("genero", "grupo_edad", "arma_grupo"):
            vc = g.groupby(col, observed=True)["cantidad"].sum()
            tot = vc.sum()
            fila[f"{col}_no_reporta_pct"] = round(float(vc.get("No reporta", 0) / tot * 100), 2)
            fila[f"{col}_no_aplica_pct"] = round(float(vc.get("No aplica", 0) / tot * 100), 2)
        out.append(fila)
    return out


def extremos(df: pd.DataFrame) -> list[dict]:
    """Concentración de la cola: qué % de la cantidad acumula el 1 % de filas
    más grandes. Con conteos (mediana 1) un z-score no discrimina."""
    out = []
    for slug, g in df.groupby("categoria_slug", observed=True):
        q = g["cantidad"].sort_values(ascending=False)
        n1 = max(1, len(q) // 100)
        out.append({"categoria_slug": slug, "mediana": float(q.median()),
                    "p99": float(q.quantile(0.99)), "max": float(q.iloc[0]),
                    "top1pct_filas_pct_cantidad": round(float(q.iloc[:n1].sum() / q.sum() * 100), 2)})
    return out


def run() -> None:
    bitacora = json.loads((REPORTS / "silver_bitacora.json").read_text())
    reporte: dict = {"controles": {}}
    coberturas = []
    for dominio in ("delitos", "operativos"):
        df = pd.read_parquet(SILVER / f"{dominio}.parquet")
        conc = conciliacion(df, bitacora, dominio)
        cob = cobertura(df)
        coberturas.append(cob)
        parciales = cob[~cob.anio_completo]
        sin_geo = df[df.cod_dpto.isna()].groupby("categoria_slug", observed=True)["cantidad"].agg(["size", "sum"])
        fuera = df[(df.anio != df.anio_archivo) & df.anio_archivo.notna()]
        reporte["controles"][dominio] = {
            "C1_conciliacion": {
                "estado": "ok" if all(c["estado"] == "ok" for c in conc) else "aviso",
                "archivos_conciliados": len(conc),
                "con_diferencia": [c for c in conc if c["estado"] != "ok"],
            },
            "C2_cobertura": {
                "estado": "aviso" if len(parciales) else "ok",
                "anios_parciales": parciales[["categoria_slug", "anio", "meses", "mes_max"]].to_dict("records"),
            },
            "C3_completitud": completitud(df),
            "C4_sin_departamento": {
                "filas": int(df.cod_dpto.isna().sum()),
                "cantidad_pct": round(float(df.loc[df.cod_dpto.isna(), "cantidad"].sum() / df.cantidad.sum() * 100), 4),
                "por_categoria": {k: {"filas": int(v["size"]), "cantidad": float(v["sum"])} for k, v in sin_geo.iterrows()},
            },
            "C5_concentracion_cola": extremos(df),
            "C6_fecha_fuera_de_archivo": {
                "filas": int(len(fuera)),
                "por_archivo": fuera.groupby("archivo", observed=True).size().loc[lambda s: s > 0].to_dict(),
            },
            "filas": int(len(df)),
            "cantidad_total": float(df.cantidad.sum()),
        }
        log.info(f"{dominio}: conciliación {sum(c['estado'] == 'ok' for c in conc)}/{len(conc)} ok · "
                 f"{len(parciales)} años parciales · {int(df.cod_dpto.isna().sum())} filas sin depto")

    cob = pd.concat(coberturas, ignore_index=True)
    cob.to_parquet(SILVER / "cobertura.parquet", index=False)
    reporte["bitacora_silver"] = bitacora
    write_json(REPORTS / "calidad.json", reporte, pretty=True)


if __name__ == "__main__":
    run()
