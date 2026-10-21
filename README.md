# Observatorio de estadística delictiva — Colombia 2010–2024

Pipeline de datos en **pandas** + dashboard estático en **Astro** (React islands con
**Recharts**, **D3** y **three.js**) sobre la estadística delictiva y los resultados
operativos de la DIJIN – Policía Nacional.

```
observatorio/
├── pipeline/            Python 3.13 · uv · pandas (versiones fijas en pyproject + uv.lock)
│   ├── run.py           orquestador:  uv run python run.py [--desde 02 | --solo 05]
│   ├── refs/            GeoJSON departamental + proyecciones de población DANE
│   └── src/obs/
│       ├── config.py    esquema canónico, alias, catálogos (fuente única de verdad)
│       ├── geografia.py DIVIPOLA, regiones, población
│       ├── esquema.py   proyección bronze → canónico
│       └── steps/       s00_inventario … s06_publicar
├── data/                (generado, no versionar)
│   ├── raw/             enlaces simbólicos a las carpetas originales
│   ├── bronze/ silver/ gold/
│   └── reports/         inventario, bitácoras, calidad
├── web/                 Astro 7 · sitio 100 % estático
│   ├── public/data/     contrato JSON (lo escribe s06)
│   └── src/{pages,components/charts,lib,layouts,styles,data}
└── docs/                plan, auditoría, diccionario, principios, análisis
```

## Uso

```bash
pnpm install                 # una vez (workspace pnpm aislado)
cd pipeline && uv sync       # una vez
pnpm pipeline                # ~5 min: Excel → JSON para la web
pnpm dev                     # http://localhost:4321
pnpm build && pnpm preview   # sitio estático en web/dist/
BASE=/observatorio/ pnpm build   # publicar en subdirectorio (GitHub Pages, etc.)
```

## Documentación

| Doc | Contenido |
|---|---|
| [docs/01-plan.md](docs/01-plan.md) | Plan, arquitectura, pasos y mapa del dashboard |
| [docs/02-auditoria.md](docs/02-auditoria.md) | Auditoría de la fuente y del pipeline anterior |
| [docs/03-diccionario-datos.md](docs/03-diccionario-datos.md) | Esquemas silver/gold y contrato JSON |
| [docs/04-principios.md](docs/04-principios.md) | Principios de datos, estadística, visualización e infraestructura |
| [docs/05-analisis-estadistico.md](docs/05-analisis-estadistico.md) | Métodos y hallazgos principales |

## Datos fuente

Los Excel originales (~600 MB) no se versionan. Para regenerar todo, crea los enlaces:

```bash
ln -s "/ruta/a/10. Estadística delictiva (2010 - 2023)" data/raw/delitos
ln -s "/ruta/a/11. Resultados operativos" data/raw/operativos
```

Los JSON ya procesados están en `web/public/data/` y `web/src/data/`, así que `pnpm build` funciona sin el pipeline.
