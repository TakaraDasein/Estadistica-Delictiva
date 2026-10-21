"""Observatorio de estadística delictiva — pipeline de datos (pandas).

Arquitectura medallion:
    raw    → archivos originales (Excel PONAL/DIJIN), sólo lectura
    bronze → una tabla parquet por hoja, columnas tal cual (todo string)
    silver → esquema canónico, tipado, catálogos controlados, enriquecido
    gold   → agregados analíticos + estadística, exportados a JSON para la web
"""
