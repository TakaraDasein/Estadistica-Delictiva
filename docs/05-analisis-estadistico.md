# 05 · Análisis estadístico

Código: `pipeline/src/obs/steps/s05_estadistica.py` → `data/gold/estadistica.json`.

| Id | Pregunta | Método | Notas |
|---|---|---|---|
| E1 | ¿Sube o baja? | Mann-Kendall (τ de Kendall vs año), pendiente Theil-Sen con IC95, TCAC | sólo años completos, ≥ 6 años |
| E2 | ¿Qué hizo la pandemia? | 2020 vs recta 2015–19; abril 2020 vs abril 2019 | % inestable con bases pequeñas |
| E3 | ¿Hay ciclo anual? | STL robusto, log1p, periodo 12; F_s = max(0, 1 − Var(R)/Var(S+R)) | huecos internos interpolados |
| E4 | ¿Qué días? | índice vs uniforme, V de Cramér | |
| E5 | ¿Qué tan concentrado? | Gini municipal, Lorenz, % top-10 | 2010–2024 acumulado |
| E6 | ¿Qué delitos co-ocurren? | ρ de Spearman entre tasas departamentales | promedio 2015–19; grafo con abs(ρ) ≥ 0,5 |
| E7 | ¿Tipos de territorio? | Ward sobre z(log1p tasa), k = 4 | |
| E8 | ¿Respuesta proporcional? | Spearman capturas/100k vs delitos/100k | |

## Hallazgos (corrida del 2026-10-21)

- **Crecimiento del registro:** ene–oct 2024 tiene +214 % delitos que ene–oct 2010. Crecen con significancia: extorsión (+17,1 %/año, τ = 0,95), violencia intrafamiliar (+13,4 %), hurto a personas (+12,2 %), amenazas (+11,6 %), delitos sexuales (+11,3 %).
- **Homicidio:** sin tendencia significativa (τ = −0,42, p = 0,06); tasa 34,1 → 25,3 por 100 mil (2010 → 2024).
- **Bajan:** piratería terrestre, secuestro, armas incautadas, vehículos recuperados.
- **COVID:** abril 2020 vs 2019: hurto a personas −73 %, hurto financiero −91 %, lesiones en tránsito −76 %; violencia intrafamiliar −0,1 %.
- **Estacionalidad:** fuerte en VIF (F_s 0,67, pico mayo) y delitos sexuales (0,71); homicidio con pico en diciembre.
- **Semana:** 40 % de las lesiones personales y 37 % de los homicidios ocurren en fin de semana (uniforme: 28,6 %).
- **Concentración:** hurto a personas Gini 0,95, top-10 municipios = 67 %; hurto a automotores top-10 = 75 %.
- **Víctimas:** VIF 78 % mujeres, delitos sexuales 85 % mujeres (55 % de los registros con artículo son contra menores de 14), homicidio 92 % hombres.
- **Territorio 2024 (homicidio/100k):** Arauca 56, Cauca 51, Valle 49, Putumayo 47 vs Bogotá 15.
- **Co-ocurrencia:** núcleo extorsión–homicidio–secuestro–hurto a motos (ρ 0,54–0,67); tránsito (homicidios–lesiones ρ 0,71).
- **Respuesta:** recuperación de motos 66 % (2010) → 28 % (2021); vehículos 67 % → 29 %; capturas vs delitos ρ = 0,64.

Las cifras se regeneran en cada corrida; las del sitio salen de `insights.json`.
