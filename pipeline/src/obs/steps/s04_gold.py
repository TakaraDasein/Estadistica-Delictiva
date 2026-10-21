"""PASO 04 — Gold: tablas analíticas agregadas (una por pregunta del dashboard).

Principios:
  * Sólo filas con fecha válida (2010-2024) y, para territorio, con departamento.
  * Tasas por 100 000 habitantes con la población DANE del mismo año y depto.
  * Años parciales nunca se comparan en bruto: se marca anio_completo y se
    publica además la cantidad ene–oct (periodo común a todas las series).

Salida: data/gold/*.parquet
"""

from __future__ import annotations

import pandas as pd

from ..config import DELITOS, GOLD, SILVER
from ..geografia import poblacion, tabla_departamentos
from ..utils import get_logger

log = get_logger("04_gold")
MES_CORTE = 10  # ene–oct: último mes común a todas las series de 2023
FAMILIA = {slug: fam for slug, _, fam in DELITOS.values()}


def _cargar() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    cols = ["dominio", "categoria_slug", "categoria", "fecha", "anio", "mes", "dia_semana",
            "cod_dpto", "cod_mpio", "municipio_fuente", "genero", "grupo_edad", "arma_grupo",
            "articulo", "subtipo", "clase_bien", "cantidad", "fecha_valida"]
    df = pd.concat([pd.read_parquet(SILVER / f"{d}.parquet", columns=cols) for d in ("delitos", "operativos")],
                   ignore_index=True)
    for c in ("dominio", "categoria_slug", "categoria"):
        df[c] = df[c].astype("string").astype("category")
    df = df[df.fecha_valida].drop(columns="fecha_valida")
    df["anio"] = df["anio"].astype(int)
    df["mes"] = df["mes"].astype(int)
    cob = pd.read_parquet(SILVER / "cobertura.parquet")
    return df, cob, poblacion()


def catalogo(df: pd.DataFrame, cob: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby(["dominio", "categoria_slug", "categoria"], observed=True).agg(
        cantidad=("cantidad", "sum"), anio_min=("anio", "min"), anio_max=("anio", "max")).reset_index()
    g["familia"] = g["categoria_slug"].map(FAMILIA).fillna("Resultados operativos")
    completos = cob[cob.anio_completo].groupby("categoria_slug")["anio"].max().rename("ultimo_anio_completo")
    return g.merge(completos, on="categoria_slug", how="left")


def serie_anual(df: pd.DataFrame, cob: pd.DataFrame, pob: pd.DataFrame) -> pd.DataFrame:
    a = df.groupby(["dominio", "categoria_slug", "anio"], observed=True)["cantidad"].sum().rename("cantidad")
    ytd = (df[df.mes <= MES_CORTE].groupby(["dominio", "categoria_slug", "anio"], observed=True)["cantidad"]
           .sum().rename("cantidad_ene_oct"))
    s = pd.concat([a, ytd], axis=1).reset_index()
    s = s.merge(cob[["categoria_slug", "anio", "meses", "anio_completo"]], on=["categoria_slug", "anio"], how="left")
    pn = pob.groupby("anio")["poblacion"].sum().rename("poblacion")
    s = s.merge(pn, on="anio", how="left")
    s["tasa_100k"] = s["cantidad"] / s["poblacion"] * 1e5
    s = s.sort_values(["categoria_slug", "anio"])
    # Variación interanual sólo entre años completos consecutivos; si alguno es
    # parcial se usa el periodo comparable ene–oct.
    prev = s.groupby("categoria_slug")[["cantidad", "cantidad_ene_oct", "anio_completo", "anio"]].shift()
    ambos = s["anio_completo"] & prev["anio_completo"].astype("boolean").fillna(False) & (s["anio"] - prev["anio"] == 1)
    s["var_anual_pct"] = ((s["cantidad"] / prev["cantidad"] - 1) * 100).where(ambos)
    s["var_ene_oct_pct"] = ((s["cantidad_ene_oct"] / prev["cantidad_ene_oct"] - 1) * 100).where(s["anio"] - prev["anio"] == 1)
    base = s[s.anio == 2010].set_index("categoria_slug")["cantidad_ene_oct"]
    s["indice_2010"] = s["cantidad_ene_oct"] / s["categoria_slug"].map(base) * 100
    return s


def serie_mensual(df: pd.DataFrame) -> pd.DataFrame:
    m = (df.groupby(["dominio", "categoria_slug", "anio", "mes"], observed=True)["cantidad"].sum().reset_index())
    m["periodo"] = pd.to_datetime(dict(year=m.anio, month=m.mes, day=1))
    return m


def depto_anual(df: pd.DataFrame, pob: pd.DataFrame) -> pd.DataFrame:
    d = (df[df.cod_dpto.notna()].groupby(["dominio", "categoria_slug", "cod_dpto", "anio"], observed=True)["cantidad"]
         .sum().reset_index())
    d["cod_dpto"] = d["cod_dpto"].astype(str)
    d = d.merge(pob, on=["cod_dpto", "anio"], how="left").merge(tabla_departamentos(), on="cod_dpto")
    d["tasa_100k"] = d["cantidad"] / d["poblacion"] * 1e5
    return d


def municipios(df: pd.DataFrame) -> pd.DataFrame:
    m = df[df.cod_mpio.notna()]
    nombres = (m.groupby(["cod_mpio", "municipio_fuente"], observed=True)["cantidad"].size()
               .reset_index().sort_values("cantidad").drop_duplicates("cod_mpio", keep="last")
               .set_index("cod_mpio")["municipio_fuente"])
    g = m.groupby(["dominio", "categoria_slug", "cod_mpio", "anio"], observed=True)["cantidad"].sum().reset_index()
    g["cod_mpio"] = g["cod_mpio"].astype(str)
    g["municipio"] = g["cod_mpio"].map(nombres.astype(str))
    g["cod_dpto"] = g["cod_mpio"].str[:2]
    return g.merge(tabla_departamentos(), on="cod_dpto", how="left")


def perfiles(df: pd.DataFrame) -> pd.DataFrame:
    """Formato largo: categoría × dimensión × valor × año."""
    partes = []
    for dim in ("genero", "grupo_edad", "arma_grupo"):
        g = df.groupby(["dominio", "categoria_slug", "anio", dim], observed=True)["cantidad"].sum().reset_index()
        partes.append(g.rename(columns={dim: "valor"}).assign(dimension=dim))
    p = pd.concat(partes, ignore_index=True)
    p["valor"] = p["valor"].astype(str)
    return p[~p["valor"].isin(["No aplica", "<NA>", "nan"])]


def temporal_fino(df: pd.DataFrame) -> pd.DataFrame:
    """Categoría × día de la semana × mes (para heatmap/radial)."""
    g = df.groupby(["dominio", "categoria_slug", "mes", "dia_semana"], observed=True)["cantidad"].sum().reset_index()
    g["dia_semana"] = g["dia_semana"].astype(int)
    return g


def subtipos(df: pd.DataFrame) -> pd.DataFrame:
    s = df[df.subtipo.notna()]
    g = (s.groupby(["dominio", "categoria_slug", "articulo", "subtipo", "anio"], observed=True)["cantidad"]
         .sum().reset_index())
    return g


def clases_bien(df: pd.DataFrame) -> pd.DataFrame:
    s = df[df.clase_bien.notna()]
    return (s.groupby(["dominio", "categoria_slug", "clase_bien", "anio"], observed=True)["cantidad"]
            .sum().reset_index())


def recuperacion(anual: pd.DataFrame, depto: pd.DataFrame) -> pd.DataFrame:
    """Tasa de recuperación = bienes recuperados / bienes hurtados (mismo año).
    Es un indicador de flujo: lo recuperado puede corresponder a hurtos de
    años anteriores, por eso puede superar 100 %."""
    pares = {"motos": "hurto-motos", "vehiculos": "hurto-automotores"}
    filas = []
    for rec, hurto in pares.items():
        for nivel, t in (("nacional", anual.assign(cod_dpto="00")), ("depto", depto)):
            r = t[t.categoria_slug == rec].set_index(["cod_dpto", "anio"])["cantidad"]
            h = t[t.categoria_slug == hurto].set_index(["cod_dpto", "anio"])["cantidad"]
            x = pd.concat([r.rename("recuperados"), h.rename("hurtados")], axis=1).dropna().reset_index()
            x["bien"] = rec
            x["nivel"] = nivel
            filas.append(x)
    out = pd.concat(filas, ignore_index=True)
    out["tasa_recuperacion_pct"] = out["recuperados"] / out["hurtados"] * 100
    return out


def run() -> None:
    GOLD.mkdir(parents=True, exist_ok=True)
    df, cob, pob = _cargar()
    log.info(f"base analítica: {len(df):,} filas")
    anual = serie_anual(df, cob, pob)
    depto = depto_anual(df, pob)
    tablas = {
        "catalogo": catalogo(df, cob),
        "serie_anual": anual,
        "serie_mensual": serie_mensual(df),
        "depto_anual": depto,
        "municipio_anual": municipios(df),
        "perfiles": perfiles(df),
        "temporal_fino": temporal_fino(df),
        "subtipos": subtipos(df),
        "clases_bien": clases_bien(df),
        "recuperacion": recuperacion(anual, depto),
        "cobertura": cob,
        "poblacion": pob.merge(tabla_departamentos(), on="cod_dpto"),
    }
    for nombre, t in tablas.items():
        t.to_parquet(GOLD / f"{nombre}.parquet", index=False)
        log.info(f"gold/{nombre}: {len(t):,} filas")


if __name__ == "__main__":
    run()
