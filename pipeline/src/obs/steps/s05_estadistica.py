"""PASO 05 — Estadística: modelos y pruebas sobre las tablas gold.

  E1 Tendencia: Mann-Kendall (τ de Kendall vs. año) + pendiente de Theil-Sen,
     sólo años completos. TCAC entre el primer y el último año completo.
  E2 Choque COVID-19: 2020 observado vs. esperado por tendencia lineal 2015-2019,
     y abril 2020 vs. abril 2019 (confinamiento estricto).
  E3 Estacionalidad: STL (periodo 12) sobre la serie mensual → tendencia,
     componente estacional, fuerza estacional F_s = max(0, 1 − Var(R)/Var(S+R)).
  E4 Día de la semana: índice vs. reparto uniforme + V de Cramér (tamaño de efecto;
     con millones de eventos el p-valor del χ² no informa).
  E5 Concentración territorial: Gini municipal, curva de Lorenz, % del top-10.
  E6 Correlación entre delitos: ρ de Spearman de tasas departamentales
     (promedio 2015-2019, años completos) → matriz y grafo (|ρ| ≥ 0,5).
  E7 Tipologías territoriales: clúster jerárquico de Ward sobre z-scores de
     log(tasa) por departamento.
  E8 Respuesta institucional: ρ de Spearman entre capturas y delitos por depto.

Salida: data/gold/estadistica.json
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats
from scipy.cluster.hierarchy import fcluster, leaves_list, linkage
from statsmodels.tsa.seasonal import STL

from ..config import GOLD
from ..utils import get_logger, records, write_json

log = get_logger("05_estadistica")
DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
VENTANA = (2015, 2019)  # periodo estable, completo y prepandemia


def tendencias(anual: pd.DataFrame) -> list[dict]:
    out = []
    for slug, g in anual[anual.anio_completo].groupby("categoria_slug"):
        if len(g) < 6:
            continue
        x, y = g["anio"].to_numpy(), g["cantidad"].to_numpy()
        tau, p = stats.kendalltau(x, y)
        pend, inter, lo, hi = stats.theilslopes(y, x)
        a0, a1 = g.iloc[0], g.iloc[-1]
        tcac = (a1.cantidad / a0.cantidad) ** (1 / (a1.anio - a0.anio)) - 1
        out.append({
            "categoria_slug": slug, "anios": int(len(g)),
            "tau": tau, "p_valor": p,
            "direccion": "creciente" if p < 0.05 and tau > 0 else "decreciente" if p < 0.05 else "sin tendencia",
            "sen_pendiente_anual": pend, "sen_ic95": [lo, hi],
            "sen_pendiente_pct_media": pend / y.mean() * 100,
            "tcac_pct": tcac * 100, "desde": int(a0.anio), "hasta": int(a1.anio),
        })
    return out


def covid(anual: pd.DataFrame, mensual: pd.DataFrame) -> list[dict]:
    out = []
    for slug, g in anual.groupby("categoria_slug"):
        base = g[g.anio.between(*VENTANA) & g.anio_completo]
        obs = g[(g.anio == 2020) & g.anio_completo]
        if len(base) < 4 or obs.empty:
            continue
        fit = stats.linregress(base.anio, base.cantidad)
        esperado = fit.intercept + fit.slope * 2020
        m = mensual[mensual.categoria_slug == slug].set_index(["anio", "mes"])["cantidad"]
        abr = (m.get((2020, 4), np.nan) / m.get((2019, 4), np.nan) - 1) * 100
        out.append({"categoria_slug": slug, "observado_2020": float(obs.cantidad.iloc[0]),
                    "esperado_2020": esperado,
                    "desvio_pct": (obs.cantidad.iloc[0] / esperado - 1) * 100,
                    "abril_2020_vs_2019_pct": abr})
    return out


def estacionalidad(mensual: pd.DataFrame) -> tuple[list[dict], list[dict]]:
    resumen, series = [], []
    for slug, g in mensual.groupby("categoria_slug"):
        s = g.set_index("periodo")["cantidad"].asfreq("MS")
        # Recortar a meses contiguos; huecos internos (años sin archivo) → interpolación
        if s.isna().mean() > 0.2 or len(s) < 48:
            continue
        s = s.interpolate(limit_direction="both")
        res = STL(np.log1p(s), period=12, robust=True).fit()
        var_r, var_sr = np.var(res.resid), np.var(res.seasonal + res.resid)
        fuerza = max(0.0, 1 - var_r / var_sr) if var_sr > 0 else 0.0
        idx = pd.Series(np.expm1(res.seasonal).values, index=s.index.month).groupby(level=0).mean()
        indice_mes = (np.exp(pd.Series(res.seasonal.values, index=s.index.month).groupby(level=0).mean()) * 100)
        resumen.append({"categoria_slug": slug, "fuerza_estacional": fuerza,
                        "mes_pico": int(indice_mes.idxmax()), "mes_valle": int(indice_mes.idxmin()),
                        "indice_mes": [round(float(v), 2) for v in indice_mes.values]})
        series.append({"categoria_slug": slug,
                       "puntos": [{"periodo": p.strftime("%Y-%m"), "observado": float(o),
                                   "tendencia": float(np.expm1(t)), "estacional": float(se)}
                                  for p, o, t, se in zip(s.index, s.values, res.trend.values, res.seasonal.values)]})
        del idx
    return resumen, series


def dia_semana(fino: pd.DataFrame) -> list[dict]:
    out = []
    for slug, g in fino.groupby("categoria_slug"):
        d = g.groupby("dia_semana")["cantidad"].sum().reindex(range(7), fill_value=0)
        n = d.sum()
        chi2 = stats.chisquare(d.values).statistic
        cramer_v = np.sqrt(chi2 / (n * 6))
        out.append({"categoria_slug": slug, "indice": [round(float(v / n * 7 * 100), 2) for v in d.values],
                    "dia_pico": DIAS[int(d.idxmax())], "v_cramer": float(cramer_v),
                    "fin_de_semana_pct": float(d[[5, 6]].sum() / n * 100)})
    return out


def gini(x: np.ndarray) -> float:
    x = np.sort(x)
    n = len(x)
    return float((2 * np.arange(1, n + 1) - n - 1) @ x / (n * x.sum()))


def concentracion(mpio: pd.DataFrame) -> list[dict]:
    out = []
    for slug, g in mpio.groupby("categoria_slug"):
        tot = g.groupby(["cod_mpio", "municipio", "departamento"])["cantidad"].sum().sort_values(ascending=False)
        x = tot.to_numpy()
        acum = np.cumsum(np.sort(x)) / x.sum()
        qs = np.linspace(0, 1, 21)
        lorenz = [{"p": float(q), "l": float(np.interp(q, np.arange(1, len(x) + 1) / len(x), acum, left=0))} for q in qs]
        out.append({"categoria_slug": slug, "municipios": int(len(x)), "gini": gini(x),
                    "top10_pct": float(x[:10].sum() / x.sum() * 100),
                    "top10": [{"cod_mpio": k[0], "municipio": k[1], "departamento": k[2], "cantidad": float(v)}
                              for k, v in tot.head(10).items()],
                    "lorenz": lorenz})
    return out


def matriz_tasas(depto: pd.DataFrame, dominio: str = "delitos") -> pd.DataFrame:
    d = depto[(depto.dominio == dominio) & depto.anio.between(*VENTANA)]
    return d.groupby(["departamento", "categoria_slug"])["tasa_100k"].mean().unstack()


def correlaciones(depto: pd.DataFrame) -> dict:
    m = matriz_tasas(depto).dropna(axis=1, thresh=25)
    rho = m.corr(method="spearman")
    orden = list(rho.columns[leaves_list(linkage(1 - rho.fillna(0).to_numpy()[np.triu_indices(len(rho), 1)], "average"))])
    rho = rho.loc[orden, orden]
    celdas = [{"a": a, "b": b, "rho": float(rho.loc[a, b])} for a in orden for b in orden]
    aristas = [c for c in celdas if c["a"] < c["b"] and abs(c["rho"]) >= 0.5]
    return {"orden": orden, "celdas": celdas, "aristas": aristas, "ventana": list(VENTANA)}


def tipologias(depto: pd.DataFrame, k: int = 4) -> dict:
    m = matriz_tasas(depto).dropna(axis=1, thresh=30).fillna(0)
    z = np.log1p(m)
    z = (z - z.mean()) / z.std(ddof=0)
    z = z.fillna(0)
    L = linkage(z.to_numpy(), "ward")
    grupos = fcluster(L, k, "maxclust")
    perfil = z.groupby(grupos).mean()
    deptos = [{"departamento": d, "grupo": int(g)} for d, g in zip(z.index, grupos)]
    rasgos = {int(g): {"altos": list(fila.sort_values(ascending=False).index[:3]),
                       "bajos": list(fila.sort_values().index[:3]),
                       "z": {k2: round(float(v), 3) for k2, v in fila.items()}}
              for g, fila in perfil.iterrows()}
    return {"k": k, "departamentos": deptos, "rasgos": rasgos, "ventana": list(VENTANA)}


def respuesta(depto: pd.DataFrame) -> dict:
    d = depto[depto.anio.between(*VENTANA)]
    cap = d[d.categoria_slug == "capturas"].groupby("departamento")["tasa_100k"].mean()
    deli = d[d.dominio == "delitos"].groupby(["departamento", "anio"])["tasa_100k"].sum().groupby(level=0).mean()
    x = pd.concat([cap.rename("capturas_100k"), deli.rename("delitos_100k")], axis=1).dropna()
    rho, p = stats.spearmanr(x.capturas_100k, x.delitos_100k)
    return {"rho": float(rho), "p_valor": float(p), "puntos": records(x.reset_index())}


def run() -> None:
    anual = pd.read_parquet(GOLD / "serie_anual.parquet")
    mensual = pd.read_parquet(GOLD / "serie_mensual.parquet")
    depto = pd.read_parquet(GOLD / "depto_anual.parquet")
    mpio = pd.read_parquet(GOLD / "municipio_anual.parquet")
    fino = pd.read_parquet(GOLD / "temporal_fino.parquet")

    est_resumen, est_series = estacionalidad(mensual)
    resultado = {
        "tendencias": tendencias(anual),
        "covid": covid(anual, mensual),
        "estacionalidad": est_resumen,
        "stl": est_series,
        "dia_semana": dia_semana(fino),
        "concentracion": concentracion(mpio),
        "correlaciones": correlaciones(depto),
        "tipologias": tipologias(depto),
        "respuesta": respuesta(depto),
    }
    write_json(GOLD / "estadistica.json", resultado)
    for k, v in resultado.items():
        log.info(f"{k}: {len(v) if isinstance(v, list) else 'ok'}")


if __name__ == "__main__":
    run()
