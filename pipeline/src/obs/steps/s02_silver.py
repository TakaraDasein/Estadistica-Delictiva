"""PASO 02 — Silver: esquema canónico, limpieza y enriquecimiento.

Por cada tabla bronze:
  1. Proyección al esquema canónico (alias + coalesce).
  2. Reparación de columnas desplazadas, detectada por CONTENIDO fila a fila:
       · género ↔ grupo de edad   (capturas_2022)
       · departamento ↔ arma/medio (Delitos_Sexuales_2021, Hurto_a_Comercio_2013)
  3. Exclusión de filas que no son datos (pies de página, totales) con motivo.
  4. Tipado: fecha (ISO o 'YYYY-MM-DD hh:mm:ss'), cantidad numérica,
     código DANE → cod_mpio (5) y cod_dpto (2).
  5. Catálogos controlados: género, grupo de edad, arma/medio agrupado.
     'No aplica' = la fuente no tiene la columna; 'No reporta' = la tiene vacía.
  6. Geografía canónica desde el código DANE (fallback: nombre del depto).
     Bogotá D.C. (11) queda separado de Cundinamarca (25).

Salida: data/silver/{delitos,operativos}.parquet + reports/silver_bitacora.json
"""

from __future__ import annotations

import re

import pandas as pd

from ..config import (ANIO_MAX, ANIO_MIN, ARMA_GRUPOS, BRONZE, DELITOS, GENERO, GRUPO_EDAD, OPERATIVOS,
                      NO_REPORTA, REPORTS, SILVER, TOKENS_METADATO, UNIFICAR_SERIES)
from ..esquema import proyectar
from ..geografia import DEPARTAMENTOS, codigo_por_nombre
from ..utils import get_logger, norm_key, write_json

log = get_logger("02_silver")
NO_APLICA = "No aplica"
NOMBRE_DELITO = {slug: (nombre, familia) for slug, nombre, familia in DELITOS.values()}


# ── 2. reparaciones ─────────────────────────────────────────────────────
def reparar_desplazamientos(df: pd.DataFrame, bit: dict) -> pd.DataFrame:
    g, e = df["genero"].map(norm_key, na_action="ignore"), df["grupo_edad"].map(norm_key, na_action="ignore")
    swap = g.isin(GRUPO_EDAD.keys()) & e.isin(GENERO.keys())
    if swap.any():
        df.loc[swap, ["genero", "grupo_edad"]] = df.loc[swap, ["grupo_edad", "genero"]].to_numpy()
        bit["swap_genero_edad"] = df.loc[swap, "archivo"].value_counts().to_dict()

    dep_ok = df["departamento"].map(codigo_por_nombre).notna()
    arma_es_dep = df["arma_medio"].map(codigo_por_nombre).notna()
    swap = ~dep_ok & arma_es_dep
    if swap.any():
        df.loc[swap, ["departamento", "arma_medio"]] = df.loc[swap, ["arma_medio", "departamento"]].to_numpy()
        bit["swap_depto_arma"] = df.loc[swap, "archivo"].value_counts().to_dict()
    return df


# ── 3. filas que no son datos ──────────────────────────────────────────
def motivo_exclusion(df: pd.DataFrame, cantidad: pd.Series) -> pd.Series:
    dep = df["departamento"].map(norm_key, na_action="ignore").fillna("")
    meta = dep.map(lambda s: len(s) > 45 or any(t in s for t in TOKENS_METADATO))
    # Fila TOTAL del Excel: cantidad numérica (la suma del archivo) pero sin
    # departamento, municipio ni fecha. Incluirla duplica el conteo.
    total = df["departamento"].isna() & df["municipio"].isna() & df["fecha"].isna()
    motivo = pd.Series(pd.NA, index=df.index, dtype="string")
    motivo[cantidad.isna()] = "cantidad no numérica (pie de página / texto)"
    motivo[motivo.isna() & total] = "fila TOTAL del archivo"
    motivo[motivo.isna() & meta] = "fila de metadatos o total"
    return motivo


# ── 4. tipado ──────────────────────────────────────────────────────────
def parse_fecha(s: pd.Series) -> pd.Series:
    f = pd.to_datetime(s.str.slice(0, 10), format="%Y-%m-%d", errors="coerce")
    # Número serial de Excel guardado como texto ('45077' → 2023-05-31)
    serial = pd.to_numeric(s.where(f.isna()), errors="coerce")
    serial = serial.where(serial.between(36000, 47000))
    f = f.fillna(pd.to_datetime(serial, unit="D", origin="1899-12-30"))
    resto = f.isna() & s.notna()
    if resto.any():
        f[resto] = pd.to_datetime(s[resto], dayfirst=True, errors="coerce", format="mixed")
    return f


def parse_dane(s: pd.Series) -> pd.Series:
    num = pd.to_numeric(s, errors="coerce")
    txt = num.astype("Int64").astype("string").str.zfill(8)
    return txt.where(num.notna() & (num > 0))


# ── 5. catálogos ───────────────────────────────────────────────────────
def catalogo(s: pd.Series, mapa: dict[str, str]) -> pd.Series:
    return s.map(norm_key, na_action="ignore").map(mapa).fillna(NO_REPORTA)


def agrupar_arma(raw: pd.Series) -> pd.Series:
    uniq = raw.dropna().unique()
    m = {}
    for v in uniq:
        k = norm_key(v)
        m[v] = next((grupo for clave, grupo in ARMA_GRUPOS if clave in k), "Otros medios")
    return raw.map(m).fillna(NO_REPORTA)


def limpiar_texto(s: pd.Series) -> pd.Series:
    t = s.str.replace(r"\s*\(CT\)\s*$", "", regex=True).str.replace(r"\s+", " ", regex=True).str.strip()
    return t.where(~t.str.upper().isin(["", "-", "NAN", "NO REPORTA", "NO REPORTADO", "NO RESPORTADO"]))


_ART = re.compile(r"^ART[IÍ]CULO\s+(\d+\s*[A-Z]?)\.?\s*", re.IGNORECASE)


def separar_articulo(s: pd.Series) -> tuple[pd.Series, pd.Series]:
    """'ARTÍCULO 209. ACTOS SEXUALES…' → ('209', 'Actos sexuales…')"""
    s = limpiar_texto(s)
    art = s.str.extract(_ART, expand=False).str.replace(" ", "", regex=False)
    nombre = s.str.replace(_ART, "", regex=True).str.strip().str.capitalize()
    return art.astype("string"), nombre.astype("string")


# ── pipeline por tabla ─────────────────────────────────────────────────
def procesar(dominio: str, slug: str, bronze: pd.DataFrame, bit: dict) -> pd.DataFrame:
    df = proyectar(bronze)
    df = reparar_desplazamientos(df, bit)

    cantidad = pd.to_numeric(df["cantidad"], errors="coerce")
    motivo = motivo_exclusion(df, cantidad)
    excl = motivo.notna()
    bit["excluidas"] = motivo[excl].value_counts().to_dict()
    # El total que declara cada archivo sirve para conciliar en el paso 03.
    es_total = motivo == "fila TOTAL del archivo"
    bit["total_declarado"] = cantidad[es_total].groupby(df.loc[es_total, "archivo"]).max().to_dict()
    df, cantidad = df[~excl].copy(), cantidad[~excl]

    out = pd.DataFrame(index=df.index)
    out["dominio"] = dominio
    out["categoria_fuente"] = slug
    out["categoria_slug"], out["categoria"] = nombre_categoria(dominio, slug)

    # fecha
    out["fecha"] = parse_fecha(df["fecha"])
    out["anio"] = out["fecha"].dt.year.astype("Int16")
    out["mes"] = out["fecha"].dt.month.astype("Int8")
    out["dia_semana"] = out["fecha"].dt.dayofweek.astype("Int8")  # 0 = lunes
    out["anio_archivo"] = df["anio_archivo"]
    bit["fecha_invalida"] = int(out["fecha"].isna().sum())
    bit["fecha_fuera_de_archivo"] = int((out["anio"] != out["anio_archivo"]).fillna(False).sum())

    # geografía
    dane = parse_dane(df["codigo_dane"])
    cod_dpto = dane.str.slice(0, 2).where(lambda s: s.isin(DEPARTAMENTOS))
    por_nombre = df["departamento"].map(codigo_por_nombre)
    bit["dpto_por_nombre"] = int((cod_dpto.isna() & por_nombre.notna()).sum())
    cod_dpto = cod_dpto.fillna(por_nombre)
    out["cod_dpto"] = cod_dpto.astype("string")
    out["cod_mpio"] = dane.str.slice(0, 5).where(cod_dpto.notna() & dane.str.slice(0, 2).eq(cod_dpto))
    out["departamento"] = cod_dpto.map(lambda c: DEPARTAMENTOS[c][0], na_action="ignore")
    out["region"] = cod_dpto.map(lambda c: DEPARTAMENTOS[c][1], na_action="ignore")
    out["municipio_fuente"] = limpiar_texto(df["municipio"]).str.title()
    bit["sin_departamento"] = int(cod_dpto.isna().sum())

    # dimensiones descriptivas
    # 'No aplica' por ARCHIVO: algunas series (p. ej. hurto a motos) sólo
    # traen género/edad en ciertos años.
    for col, mapa in (("genero", GENERO), ("grupo_edad", GRUPO_EDAD)):
        archivo_sin_col = df.groupby("archivo", observed=True)[col].transform(lambda s: s.isna().all())
        out[col] = catalogo(df[col], mapa).mask(archivo_sin_col, NO_APLICA)
    arma = limpiar_texto(df["arma_medio"])
    out["arma_medio"] = arma.str.capitalize()
    out["arma_grupo"] = agrupar_arma(arma) if arma.notna().any() else NO_APLICA
    out["articulo"], out["subtipo"] = separar_articulo(df["subtipo"])
    out["clase_bien"] = limpiar_texto(df["clase_bien"]).str.capitalize()
    out["cantidad"] = cantidad.astype("float64")
    out["archivo"] = df["archivo"]
    bit["filas"] = len(out)
    bit["cantidad_total"] = float(out["cantidad"].sum())
    return out


def nombre_categoria(dominio: str, slug: str) -> tuple[str, str]:
    """→ (slug canónico, nombre visible), aplicando UNIFICAR_SERIES."""
    if slug in UNIFICAR_SERIES:
        return UNIFICAR_SERIES[slug]
    if slug in {s for s, _ in UNIFICAR_SERIES.values()}:
        return next(v for v in UNIFICAR_SERIES.values() if v[0] == slug)
    if dominio == "delitos":
        return slug, NOMBRE_DELITO[slug][0]
    return slug, next(n for _, (s, n, _) in OPERATIVOS if s == slug)


CATEGORICAS = ["dominio", "categoria_fuente", "categoria_slug", "categoria", "cod_dpto", "cod_mpio",
               "departamento", "region", "municipio_fuente", "genero", "grupo_edad", "arma_medio",
               "arma_grupo", "articulo", "subtipo", "clase_bien", "archivo"]


def run() -> None:
    SILVER.mkdir(parents=True, exist_ok=True)
    bitacora = {}
    for dominio in ("delitos", "operativos"):
        partes = []
        for p in sorted(BRONZE.glob(f"{dominio}__*.parquet")):
            slug = p.stem.split("__", 1)[1]
            bit = bitacora.setdefault(f"{dominio}/{slug}", {})
            partes.append(procesar(dominio, slug, pd.read_parquet(p), bit))
            log.info(f"{dominio}/{slug}: {bit['filas']:,} filas · excluidas {sum(bit['excluidas'].values()):,}"
                     f" · fecha inválida {bit['fecha_invalida']} · sin depto {bit['sin_departamento']}")
        df = pd.concat(partes, ignore_index=True)
        fuera = ~df["anio"].between(ANIO_MIN, ANIO_MAX)
        if fuera.any():
            log.warning(f"{dominio}: {int(fuera.sum())} filas con año fuera de {ANIO_MIN}-{ANIO_MAX} (se conservan, marcadas)")
        df["fecha_valida"] = df["anio"].between(ANIO_MIN, ANIO_MAX).fillna(False)
        for c in CATEGORICAS:
            df[c] = df[c].astype("category")
        df.to_parquet(SILVER / f"{dominio}.parquet", index=False)
        log.info(f"✓ silver/{dominio}.parquet · {len(df):,} filas · cantidad {df['cantidad'].sum():,.0f}")
    write_json(REPORTS / "silver_bitacora.json", bitacora, pretty=True)


if __name__ == "__main__":
    run()
