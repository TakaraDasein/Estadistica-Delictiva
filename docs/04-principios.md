# 04 · Principios

## Datos
1. **Raw es inmutable.** Sólo se lee; se enlaza, no se copia.
2. **Sin pérdida antes de entender.** Bronze guarda todo como texto; las decisiones ocurren en silver y quedan en bitácora.
3. **Nunca deduplicar filas.** Dos filas iguales son dos eventos; sólo se descartan *archivos* con contenido idéntico.
4. **Conciliar siempre.** Cada archivo debe sumar lo que declara su TOTAL.
5. **Corregir por contenido, no por nombre de archivo.** Las reparaciones detectan el patrón fila a fila.
6. **Distinguir "No reporta" de "No aplica".** Ausencia de dato ≠ ausencia de columna.
7. **Una sola fuente de verdad** (`config.py`, `geografia.py`) para alias, catálogos y series.
8. **Trazabilidad:** toda fila silver conserva `archivo`.

## Estadística
1. Comparar sólo lo comparable: años completos o periodo común ene–oct.
2. Tasas por 100 mil con población del mismo año y territorio.
3. Métodos robustos y no paramétricos (Mann-Kendall, Theil-Sen, Spearman, STL robusto).
4. Tamaño de efecto antes que p-valor cuando *n* es enorme.
5. Toda cifra del relato se calcula en el pipeline (`insights.json`); ninguna se escribe a mano.
6. Registros administrativos ≠ victimización: se dice explícitamente.

## Visualización
1. La forma la decide la pregunta; el color va al final.
2. Paleta validada (CVD) con modo oscuro seleccionado, no invertido.
3. El color sigue a la entidad, nunca al rango; ≤ 4 series con leyenda y etiqueta directa; mapas categóricos > 3 → facetas.
4. Secuencial = un tono; divergente = dos tonos + gris neutro.
5. Un solo eje Y; nada de doble eje.
6. Tooltip en todo gráfico; texto en tinta, no en color de serie.
7. 3D sólo cuando aporta (relieve del riesgo) y siempre con equivalente 2D.

## Infraestructura
1. **Versiones exactas**: `pyproject.toml` (`==`) + `uv.lock`; `package.json` sin `^` + `.npmrc save-exact` + `pnpm-lock.yaml`.
2. **pnpm siempre** (workspace propio en `observatorio/`), **uv** para Python.
3. Sitio 100 % estático (`output: "static"`), base configurable con `BASE`.
4. Islas hidratadas al ser visibles; datos bajo demanda con caché compartida.
5. Pasos idempotentes y re-ejecutables por separado.

| Stack | Versión |
|---|---|
| Python / pandas / pyarrow / scipy / statsmodels / shapely | 3.13 / 3.0.2 / 26.0.0 / 1.18.1 / 0.15.0 / 2.2.0 |
| Astro / React / Recharts / three / d3-geo / d3-force | 7.4.2 / 19.3.1 / 3.10.1 / 0.186.1 / 3.1.1 / 3.0.0 |
| pnpm / uv / TypeScript | 11.1.1 / 0.12.4 / 5.9.3 |
