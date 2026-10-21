# 02 · Auditoría

## A. Fuente (DIJIN)

| # | Hallazgo | Impacto | Tratamiento (paso) |
|---|---|---|---|
| 1 | Cada Excel termina con una **fila TOTAL** con la suma del archivo, sin depto/municipio/fecha | +25 % en delitos, +45 % en droga si se suma | excluida y usada para conciliar (s02, s03) |
| 2 | Encabezado en fila 9, 10 u 0; 31 variantes de nombre de columna (`MUNICIPO`, `ARMAS MEDIO`, `*AGRUPA_EDAD_PERSONA`…) | columnas perdidas | detección de encabezado + `COL_ALIAS` con coalesce (s00, s02) |
| 3 | `capturas_2022`: etiquetas de género y edad intercambiadas | 119 k filas mal clasificadas | swap por contenido (s02) |
| 4 | `Delitos_Sexuales_2021`, `Hurto_a_Comercio_2013`: departamento ↔ arma | 31 k filas sin geografía | swap por contenido (s02) |
| 5 | Exportaciones duplicadas 2018 (`_0`/`_1`, `_0`/`_2`) en 4 series | doble conteo | huella de filas de datos (s01) |
| 6 | `Lesiones_En_Accidente_De_Transito_2014_0.xlsx` en la carpeta de homicidios en tránsito | serie mezclada | `RELOCALIZAR` (s00) |
| 7 | "Abigeato" 2010–22 renombrado "Hurto a cabezas de ganado" 2023–24 | serie cortada | `UNIFICAR_SERIES` (s02) |
| 8 | Fechas como texto con hora y como serial Excel (`45077`) | 137 k fechas inválidas | parser multiformato (s02) |
| 9 | Totales de armas 2010–18 con punto de miles (`44.563`) | conciliación falsa | ×1000 en conciliación (s03) |
| 10 | Años parciales: 2023 ≈ ene–oct; homicidios 2022 ene–ago; hurto financieras 2024 11 meses | caídas artificiales | `anio_completo`, métricas ene–oct (s03, s04) |
| 11 | Sin archivo: homicidios y extorsión 2018, hurto automotores 2010, droga 2022, operativos 2024 | huecos | matriz de cobertura publicada |
| 12 | Bogotá dentro de Cundinamarca en algunos archivos | Cundinamarca inflada | depto desde código DANE (s02) |
| 13 | Incautaciones fuera del país (Miami…) sin departamento | 21 filas | se conservan en totales, fuera de mapas |
| 14 | Hojas vacías con sólo pie de página (libros 2023 con 2 hojas) | — | descartadas en inventario |
| 15 | `5. Graficos/` contiene .twb y Excel de trabajo, no fuente | — | ignorada |

**Resultado:** 8 717 618 filas limpias; **99/99 archivos con TOTAL concilian** (|dif| < 0,5 %);
0 fechas inválidas; 24 filas sin departamento (0,02 % de la cantidad).

## B. Pipeline anterior (`../pipeline`, `../web`)

| Problema | Consecuencia |
|---|---|
| `drop_duplicates` por fila | borraba eventos reales (filas idénticas = casos distintos) |
| No excluía filas TOTAL con cantidad numérica | totales inflados |
| `CLASE BIEN`, `DELITO`, `DESCRIPCION CONDUCTA CAPTURA` no mapeadas | `clase`/`subclase` 100 % nulas: sin tipo de droga ni arma |
| `cantidad` vacía → 1 | sesgo silencioso |
| Fecha de respaldo desde `anio` que nunca existía | imputación inefectiva |
| Sin control de duplicados 2018 ni columnas intercambiadas | doble conteo / geografía errónea |
| Sin población → sin tasas; centroides en lugar de polígonos | mapas = mapas de población |
| Dependencias con `^`/`>=` y npm + pnpm mezclados | builds no reproducibles |
| Enlaces simbólicos a una ruta inexistente | pipeline no re-ejecutable |

El proyecto nuevo (`observatorio/`) reemplaza ambos sin modificarlos.
