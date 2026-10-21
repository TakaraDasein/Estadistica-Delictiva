"""Referencias geográficas: DIVIPOLA departamental, regiones y población DANE."""

from __future__ import annotations

import pandas as pd

from .config import REFS
from .utils import norm_key

# código DANE → (nombre oficial, región natural)
DEPARTAMENTOS: dict[str, tuple[str, str]] = {
    "05": ("Antioquia", "Andina"),
    "08": ("Atlántico", "Caribe"),
    "11": ("Bogotá D.C.", "Andina"),
    "13": ("Bolívar", "Caribe"),
    "15": ("Boyacá", "Andina"),
    "17": ("Caldas", "Andina"),
    "18": ("Caquetá", "Amazonía"),
    "19": ("Cauca", "Pacífica"),
    "20": ("Cesar", "Caribe"),
    "23": ("Córdoba", "Caribe"),
    "25": ("Cundinamarca", "Andina"),
    "27": ("Chocó", "Pacífica"),
    "41": ("Huila", "Andina"),
    "44": ("La Guajira", "Caribe"),
    "47": ("Magdalena", "Caribe"),
    "50": ("Meta", "Orinoquía"),
    "52": ("Nariño", "Pacífica"),
    "54": ("Norte de Santander", "Andina"),
    "63": ("Quindío", "Andina"),
    "66": ("Risaralda", "Andina"),
    "68": ("Santander", "Andina"),
    "70": ("Sucre", "Caribe"),
    "73": ("Tolima", "Andina"),
    "76": ("Valle del Cauca", "Pacífica"),
    "81": ("Arauca", "Orinoquía"),
    "85": ("Casanare", "Orinoquía"),
    "86": ("Putumayo", "Amazonía"),
    "88": ("San Andrés y Providencia", "Insular"),
    "91": ("Amazonas", "Amazonía"),
    "94": ("Guainía", "Amazonía"),
    "95": ("Guaviare", "Amazonía"),
    "97": ("Vaupés", "Amazonía"),
    "99": ("Vichada", "Orinoquía"),
}

# Variantes de nombre observadas en las fuentes → código
_ALIAS_EXTRA = {
    "VALLE": "76", "GUAJIRA": "44", "SAN ANDRES": "88",
    "SAN ANDRES Y PROVIDENCIA": "88", "ARCHIPIELAGO DE SAN ANDRES": "88",
    "BOGOTA": "11", "BOGOTA D.C.": "11", "BOGOTA, D.C.": "11", "BOGOTA D.C": "11",
}
NOMBRE_A_CODIGO = {norm_key(n): c for c, (n, _) in DEPARTAMENTOS.items()} | _ALIAS_EXTRA


def codigo_por_nombre(nombre: object) -> str | None:
    if nombre is None or pd.isna(nombre):
        return None
    return NOMBRE_A_CODIGO.get(norm_key(nombre))


def tabla_departamentos() -> pd.DataFrame:
    return pd.DataFrame(
        [(c, n, r) for c, (n, r) in DEPARTAMENTOS.items()],
        columns=["cod_dpto", "departamento", "region"],
    )


def poblacion() -> pd.DataFrame:
    """Población total por departamento y año (DANE, proyecciones censo 2018;
    2020+ con actualización post COVID-19). → cod_dpto, anio, poblacion"""
    partes = []
    for f in ("DCD-area-proypoblacion-dep-2005-2019.xlsx",
              "DCD-area-proypoblacion-dep-2020-2050-ActPostCOVID-19.xlsx"):
        df = pd.read_excel(REFS / f, header=11, engine="calamine")
        df.columns = ["cod_dpto", "nombre", "anio", "area", "poblacion"]
        df = df[df["area"].astype(str).str.strip().str.lower() == "total"]
        partes.append(df)
    pob = pd.concat(partes, ignore_index=True)
    pob["cod_dpto"] = pob["cod_dpto"].astype(str).str.zfill(2)
    pob["anio"] = pob["anio"].astype(int)
    pob["poblacion"] = pob["poblacion"].astype("int64")
    pob = pob[pob["cod_dpto"].isin(DEPARTAMENTOS)]
    return pob[["cod_dpto", "anio", "poblacion"]].drop_duplicates(["cod_dpto", "anio"])
