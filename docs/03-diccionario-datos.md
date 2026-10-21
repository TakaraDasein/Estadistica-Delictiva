# 03 · Diccionario de datos

## Silver — `data/silver/{delitos,operativos}.parquet` (una fila = un registro de la fuente)

| Columna | Tipo | Descripción |
|---|---|---|
| dominio | cat | `delitos` · `operativos` |
| categoria_fuente | cat | serie según carpeta/archivo original |
| categoria_slug / categoria | cat | serie canónica (abigeato unificado) |
| fecha, anio, mes | date/int | fecha del hecho |
| dia_semana | int | 0 = lunes … 6 = domingo |
| anio_archivo | int | año del archivo (control de coherencia) |
| fecha_valida | bool | año dentro de 2010–2024 |
| cod_dpto / cod_mpio | cat | DIVIPOLA 2 / 5 dígitos (desde el código DANE) |
| departamento, region | cat | nombre oficial y región natural |
| municipio_fuente | cat | nombre tal como viene (limpio) |
| genero | cat | Femenino · Masculino · No reporta · **No aplica** (la fuente no tiene la columna) |
| grupo_edad | cat | Menores (0–12) · Adolescentes (12–18) · Adultos · No reporta · No aplica |
| arma_medio / arma_grupo | cat | valor original / 12 grupos (`config.ARMA_GRUPOS`) |
| articulo, subtipo | cat | artículo del Código Penal y conducta (delitos sexuales, secuestro, capturas) |
| clase_bien | cat | tipo de droga, arma o vehículo (operativos) |
| cantidad | float | casos / personas / unidades; **gramos** para droga |
| archivo | cat | trazabilidad a la fuente |

## Gold — `data/gold/*.parquet`

| Tabla | Grano | Columnas clave |
|---|---|---|
| catalogo | serie | cantidad, rango de años, familia, último año completo |
| serie_anual | serie × año | cantidad, cantidad_ene_oct, meses, anio_completo, tasa_100k, var_anual_pct, var_ene_oct_pct, indice_2010 |
| serie_mensual | serie × año × mes | cantidad |
| depto_anual | serie × depto × año | cantidad, poblacion, tasa_100k, region |
| municipio_anual | serie × municipio × año | cantidad |
| perfiles | serie × año × dimensión × valor | cantidad |
| temporal_fino | serie × mes × día semana | cantidad |
| subtipos / clases_bien | serie × subtipo/clase × año | cantidad |
| recuperacion | bien × depto × año | recuperados, hurtados, tasa_recuperacion_pct |
| cobertura | serie × año | meses, anio_completo |
| estadistica.json | — | ver docs/05 |

## Contrato web — `web/public/data/*.json`

| Archivo | Forma |
|---|---|
| anual.json | `Anual[]` (serie_anual sin población) |
| mensual.json | `{slug: [[anio, mes, cantidad]]}` |
| depto.json | `{slug: [[cod_dpto, anio, cantidad, tasa_100k]]}` |
| municipios_top.json | top 40 municipios por serie |
| perfiles.json, temporal.json, subtipos.json, clases.json, capturas_delito.json, recuperacion.json | registros |
| estadistica.json | resultados de s05 |
| calidad.json | cobertura, controles, inventario, bitácora |
| departamentos.geo.json | GeoJSON simplificado (0,01°), `properties.cod_dpto` |

`web/src/data/` (importado en build): `catalogo.json`, `departamentos.json`, `insights.json`
(cifras del relato — todas calculadas). Tipos TypeScript en `web/src/lib/data.ts`.
