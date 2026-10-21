import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { Depto } from "./data";

export interface GeoFeature { type: "Feature"; properties: { cod_dpto: string }; geometry: GeoPermissibleObjects & { type: string; coordinates: unknown } }
export interface GeoFC { type: "FeatureCollection"; features: GeoFeature[] }

/** San Andrés queda fuera del encuadre continental: se dibuja en un recuadro aparte. */
export const ISLA = "88";

export function proyectar(geo: GeoFC, w: number, h: number) {
  const continental = { ...geo, features: geo.features.filter((f) => f.properties.cod_dpto !== ISLA) };
  const proj = geoMercator().fitSize([w, h], continental as unknown as GeoPermissibleObjects);
  return { proj, path: geoPath(proj), continental };
}

/** {cod_dpto: {cantidad, tasa}} para una categoría y año. */
export function valoresDepto(depto: Depto, slug: string, anio: number) {
  const out: Record<string, { cantidad: number; tasa: number }> = {};
  for (const [cod, a, cantidad, tasa] of depto[slug] ?? []) if (a === anio) out[cod] = { cantidad, tasa };
  return out;
}

export function aniosDisponibles(depto: Depto, slug: string) {
  return [...new Set((depto[slug] ?? []).map((r) => r[1]))].sort((a, b) => a - b);
}
