"""PASO 00 — Inventario de fuentes.

Recorre data/raw y cataloga cada hoja de cada libro Excel:
dominio, categoría, año, fila de encabezado, columnas, hash del archivo.
Detecta: duplicados exactos (mismo hash), archivos mal ubicados, hojas sin
encabezado y huecos de cobertura (categoría × año).

Salida: data/reports/inventario.parquet + inventario.json
"""

from __future__ import annotations

import hashlib

import pandas as pd

from ..config import ANIO_MIN, ANIO_MAX, DELITOS, OPERATIVOS, RAW_DELITOS, RAW_OPERATIVOS, RELOCALIZAR, REPORTS
from ..utils import get_logger, norm_col, write_json, year_from_name

log = get_logger("00_inventario")


def _md5(path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def detectar_encabezado(preview: pd.DataFrame) -> int | None:
    """Primera fila que contiene DEPARTAMENTO/DEPTO y CANTIDAD."""
    for i in range(len(preview)):
        cells = {norm_col(x) for x in preview.iloc[i].dropna().tolist()}
        if any(c.startswith("DEP") for c in cells) and "CANTIDAD" in cells:
            return i
    return None


def _clasificar(path) -> tuple[str, str, str, str] | None:
    """→ (dominio, categoria_slug, categoria, extra) o None si se ignora."""
    if path.is_relative_to(RAW_DELITOS):
        carpeta = RELOCALIZAR.get(path.name, path.parent.name)
        if carpeta not in DELITOS:
            return None
        slug, nombre, familia = DELITOS[carpeta]
        return "delitos", slug, nombre, familia
    low = path.name.lower()
    for patron, (slug, nombre, unidad) in OPERATIVOS:
        if patron in low:
            return "operativos", slug, nombre, unidad
    return None


def run() -> pd.DataFrame:
    filas = []
    archivos = sorted(
        [*RAW_DELITOS.rglob("*.xls*"), *RAW_OPERATIVOS.rglob("*.xls*")]
    )
    for path in archivos:
        clase = _clasificar(path)
        if clase is None:
            log.info(f"ignorado (no es fuente tabular): {path.relative_to(path.parents[1])}")
            continue
        dominio, slug, nombre, extra = clase
        xl = pd.ExcelFile(path, engine="calamine")
        md5 = _md5(path)
        for hoja in xl.sheet_names:
            preview = pd.read_excel(xl, sheet_name=hoja, header=None, nrows=25)
            hdr = detectar_encabezado(preview)
            cols = [norm_col(c) for c in preview.iloc[hdr].dropna()] if hdr is not None else []
            filas.append({
                "dominio": dominio,
                "categoria_slug": slug,
                "categoria": nombre,
                "extra": extra,
                "anio_archivo": year_from_name(path.name)
                    or (int(path.parent.name) if path.parent.name.isdigit() else None),
                "archivo": path.name,
                "ruta": str(path.relative_to(path.parents[2])),
                "hoja": hoja,
                "fila_encabezado": hdr,
                "columnas": "|".join(cols),
                "md5": md5,
                "bytes": path.stat().st_size,
                "relocalizado": path.name in RELOCALIZAR,
            })

    inv = pd.DataFrame(filas)
    inv["hoja_util"] = inv["fila_encabezado"].notna()
    inv["duplicado_exacto"] = inv.duplicated(["md5", "hoja"], keep="first")

    # Matriz de cobertura categoría × año (sólo hojas útiles)
    util = inv[inv.hoja_util & ~inv.duplicado_exacto]
    cobertura = (
        util.groupby(["dominio", "categoria_slug", "anio_archivo"]).size()
        .unstack(fill_value=0)
        .reindex(columns=range(ANIO_MIN, ANIO_MAX + 1), fill_value=0)
    )
    huecos = [
        {"dominio": d, "categoria_slug": c, "anio": int(a)}
        for (d, c), row in cobertura.iterrows()
        for a, n in row.items()
        if n == 0
    ]
    multiples = (
        util.groupby(["categoria_slug", "anio_archivo"])["archivo"].nunique().loc[lambda s: s > 1]
    )

    REPORTS.mkdir(parents=True, exist_ok=True)
    inv.to_parquet(REPORTS / "inventario.parquet", index=False)
    write_json(REPORTS / "inventario.json", {
        "archivos": int(inv["archivo"].nunique()),
        "hojas": int(len(inv)),
        "hojas_sin_encabezado": inv.loc[~inv.hoja_util, ["ruta", "hoja"]].to_dict("records"),
        "duplicados_exactos": inv.loc[inv.duplicado_exacto, ["ruta", "hoja"]].to_dict("records"),
        "relocalizados": inv.loc[inv.relocalizado, ["ruta"]].drop_duplicates().to_dict("records"),
        "varios_archivos_mismo_anio": [
            {"categoria_slug": c, "anio": int(a), "archivos": int(n)} for (c, a), n in multiples.items()
        ],
        "huecos_cobertura": huecos,
        "cobertura": {f"{d}/{c}": {str(k): int(v) for k, v in row.items()} for (d, c), row in cobertura.iterrows()},
    }, pretty=True)

    log.info(f"{inv['archivo'].nunique()} archivos · {len(inv)} hojas · "
             f"{(~inv.hoja_util).sum()} hojas sin encabezado · {inv.duplicado_exacto.sum()} duplicadas · "
             f"{len(huecos)} huecos categoría×año")
    return inv


if __name__ == "__main__":
    run()
