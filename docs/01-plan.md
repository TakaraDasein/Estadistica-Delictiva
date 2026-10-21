# 01 · Plan y arquitectura

## Objetivo
Convertir ~340 libros Excel heterogéneos (DIJIN, 2010–2024) en un modelo de datos limpio,
validado y documentado, y sobre él construir un dashboard estático con relato de datos.

## Arquitectura

```
raw (Excel) ─s00─► inventario ─s01─► bronze ─s02─► silver ─s03─► calidad
                                                     │
                                                     └─s04─► gold ─s05─► estadística ─s06─► web/public/data/*.json
                                                                                          web/src/data/*.json
                                                                                                │
                                                                                     Astro (SSG) + islas React
```

| Paso | Entrada → salida | Qué resuelve |
|---|---|---|
| s00 inventario | raw → `reports/inventario.*` | catálogo de hojas, encabezado, hash, huecos, reubicaciones |
| s01 bronze | Excel → `bronze/{dominio}__{serie}.parquet` | ingesta sin pérdida; descarta exportaciones duplicadas por huella de contenido |
| s02 silver | bronze → `silver/{delitos,operativos}.parquet` | esquema canónico, columnas desplazadas, filas TOTAL, fechas, DANE, catálogos |
| s03 calidad | silver → `reports/calidad.json`, `silver/cobertura.parquet` | conciliación, cobertura mensual, completitud, colas |
| s04 gold | silver → `gold/*.parquet` | una tabla por pregunta del dashboard; tasas por 100 mil |
| s05 estadística | gold → `gold/estadistica.json` | tendencias, STL, COVID, Gini, Spearman, clústeres |
| s06 publicar | gold → JSON web + geometría simplificada | contrato de datos compacto |

Rendimiento: ~5 min completo (la lectura de Excel con *calamine* domina); cada paso es
idempotente y re-ejecutable con `--solo` / `--desde`.

## Dashboard (recorrido narrativo)

| Ruta | Capítulo | Visualizaciones |
|---|---|---|
| `/` | Relato | KPIs, trayectorias (índice), choque COVID, reloj radial, mapa, perfiles, recuperación |
| `/tiempo` | Tiempo | explorador de tendencias (Recharts), múltiplos pequeños + Mann-Kendall, STL, radar estacional, heatmap semana×mes, barras divergentes COVID |
| `/territorio` | Territorio | coropleta D3 + ranking enlazado, **mapa 3D extruido (three.js)**, Lorenz, Gini, top municipios, tipologías (facetas) |
| `/perfiles` | Perfiles | barras 100 % (género, edad, arma), artículos del Código Penal |
| `/relaciones` | Relaciones | **grafo de fuerzas D3** (co-ocurrencia), matriz de correlación |
| `/respuesta` | Respuesta | trayectorias operativas, capturas por delito, armas, droga (área apilada, t), tasa de recuperación, dispersión capturas vs delitos |
| `/delitos`, `/delito/[slug]` | Fichas | 23 fichas generadas estáticamente |
| `/metodologia` | Método | pasos, auditoría, matriz de cobertura |

Cada isla React se hidrata con `client:visible` (el 3D con `client:only`) y descarga sólo los
JSON que necesita (caché compartida entre islas).

## Próximos pasos sugeridos
1. Geometría municipal (DANE MGN) para coropletas a nivel municipio.
2. Tests de regresión del pipeline (pytest sobre `reports/calidad.json`: 100 % conciliado).
3. CI: `pnpm all` y publicación de `web/dist/` en GitHub Pages / Cloudflare Pages.
4. Integrar 2024 de operativos cuando la fuente lo publique.
