"""Proyección de una tabla bronze al esquema canónico (sin limpiar valores)."""

from __future__ import annotations

import pandas as pd

from .config import COL_ALIAS

CANONICAS = ["departamento", "municipio", "codigo_dane", "fecha", "arma_medio",
             "genero", "grupo_edad", "subtipo", "clase_bien", "cantidad"]
AUXILIARES = ["archivo", "hoja", "anio_archivo", "categoria_extra"]


def proyectar(bronze: pd.DataFrame) -> pd.DataFrame:
    """Renombra por alias y une (coalesce) los alias que caen en la misma
    columna canónica: cada archivo usa sólo uno, el resto llega vacío."""
    out = pd.DataFrame(index=bronze.index)
    for canon in CANONICAS:
        fuentes = [c for c in bronze.columns if COL_ALIAS.get(c) == canon]
        s = pd.Series(pd.NA, index=bronze.index, dtype="string")
        for c in fuentes:
            s = s.fillna(bronze[c])
        out[canon] = s
    for c in AUXILIARES:
        out[c] = bronze[c]
    sin_mapear = set(bronze.columns) - set(COL_ALIAS) - set(AUXILIARES)
    if sin_mapear:
        raise ValueError(f"Columnas sin alias en config.COL_ALIAS: {sorted(sin_mapear)}")
    return out
