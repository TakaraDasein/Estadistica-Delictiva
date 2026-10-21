"""PASO 01 — Bronze: ingesta fiel de cada hoja útil.

Reglas:
  * Se lee desde la fila de encabezado detectada en el inventario.
  * Nombres de columna normalizados (norm_col); valores sin transformar,
    todo como texto (fechas en ISO) → ingesta sin pérdida.
  * Se descartan sólo filas 100 % vacías.
  * Duplicado de ARCHIVO (mismo contenido, distinto binario, p. ej. *_2018_0 y
    *_2018_1): se conserva el primero. Nunca se deduplican FILAS: dos filas
    idénticas son dos eventos distintos (cada una con su CANTIDAD).

Salida: data/bronze/{dominio}__{categoria_slug}.parquet
"""

from __future__ import annotations

import hashlib

import pandas as pd

from ..config import BRONZE, RAW, REPORTS
from ..utils import get_logger, norm_col, write_json

log = get_logger("01_bronze")


def _a_texto(s: pd.Series) -> pd.Series:
    if pd.api.types.is_datetime64_any_dtype(s):
        return s.dt.strftime("%Y-%m-%d").astype("string")
    return s.astype("string").str.strip()


def leer_hoja(ruta: str, hoja: str, fila_encabezado: int) -> pd.DataFrame:
    df = pd.read_excel(RAW / ruta, sheet_name=hoja, header=fila_encabezado, engine="calamine")
    df.columns = [norm_col(c) for c in df.columns]
    df = df.loc[:, [c for c in df.columns if c and not c.startswith("UNNAMED")]]
    df = df.dropna(how="all")
    return df.apply(_a_texto)


def _huella(df: pd.DataFrame) -> str:
    """Hash de las filas de datos (CANTIDAD numérica): ignora pies de página,
    que cambian entre exportaciones aunque los datos sean los mismos."""
    datos = df[pd.to_numeric(df.get("CANTIDAD"), errors="coerce").notna()]
    return hashlib.md5(pd.util.hash_pandas_object(datos, index=False).values.tobytes()).hexdigest()


def run() -> None:
    inv = pd.read_parquet(REPORTS / "inventario.parquet")
    inv = inv[inv.hoja_util & ~inv.duplicado_exacto]
    BRONZE.mkdir(parents=True, exist_ok=True)
    bitacora = []

    for (dominio, slug), grupo in inv.groupby(["dominio", "categoria_slug"], sort=True):
        partes, vistos = [], {}
        for r in grupo.itertuples():
            df = leer_hoja(r.ruta, r.hoja, int(r.fila_encabezado))
            huella = _huella(df)
            entrada = {"dominio": dominio, "categoria_slug": slug, "ruta": r.ruta, "hoja": r.hoja,
                       "filas": len(df), "columnas": list(df.columns)}
            if huella in vistos:
                entrada["descartado"] = f"contenido idéntico a {vistos[huella]}"
                log.warning(f"{r.archivo}: contenido idéntico a {vistos[huella]} → descartado")
                bitacora.append(entrada)
                continue
            vistos[huella] = r.archivo
            df["archivo"] = r.archivo
            df["hoja"] = r.hoja
            df["anio_archivo"] = pd.array([r.anio_archivo] * len(df), dtype="Int16")
            df["categoria_extra"] = r.extra
            partes.append(df)
            bitacora.append(entrada)
        out = pd.concat(partes, ignore_index=True)
        out.to_parquet(BRONZE / f"{dominio}__{slug}.parquet", index=False)
        log.info(f"{dominio}/{slug}: {len(partes)} hojas · {len(out):,} filas")

    write_json(REPORTS / "bronze_bitacora.json", bitacora, pretty=True)


if __name__ == "__main__":
    run()
