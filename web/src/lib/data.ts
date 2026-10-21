/** Contrato de datos (generado por pipeline/src/obs/steps/s06_publicar.py). */
import { useEffect, useState } from "react";
import catalogoJson from "@/data/catalogo.json";
import departamentosJson from "@/data/departamentos.json";

export type Dominio = "delitos" | "operativos";

export interface Categoria {
  dominio: Dominio; categoria_slug: string; categoria: string; cantidad: number;
  anio_min: number; anio_max: number; familia: string; ultimo_anio_completo: number | null;
}
export interface Anual {
  dominio: Dominio; categoria_slug: string; anio: number; cantidad: number; cantidad_ene_oct: number;
  meses: number; anio_completo: boolean; tasa_100k: number; var_anual_pct: number | null;
  var_ene_oct_pct: number | null; indice_2010: number | null;
}
export type Mensual = Record<string, [number, number, number][]>; // [anio, mes, cantidad]
export type Depto = Record<string, [string, number, number, number][]>; // [cod, anio, cantidad, tasa]
export interface Perfil { categoria_slug: string; anio: number; valor: string; cantidad: number; dimension: "genero" | "grupo_edad" | "arma_grupo" }
export interface Temporal { categoria_slug: string; mes: number; dia_semana: number; cantidad: number }
export interface Subtipo { categoria_slug: string; articulo: string | null; subtipo: string; anio: number; cantidad: number }
export interface Clase { categoria_slug: string; clase_bien: string; anio: number; cantidad: number }
export interface Recuperacion { cod_dpto: string; anio: number; recuperados: number; hurtados: number; bien: "motos" | "vehiculos"; nivel: "nacional" | "depto"; tasa_recuperacion_pct: number }
export interface MunicipioTop { categoria_slug: string; cod_mpio: string; municipio: string; departamento: string; cantidad: number }
export interface Estadistica {
  tendencias: { categoria_slug: string; anios: number; tau: number; p_valor: number; direccion: string; sen_pendiente_anual: number; sen_ic95: [number, number]; sen_pendiente_pct_media: number; tcac_pct: number; desde: number; hasta: number }[];
  covid: { categoria_slug: string; observado_2020: number; esperado_2020: number; desvio_pct: number; abril_2020_vs_2019_pct: number | null }[];
  estacionalidad: { categoria_slug: string; fuerza_estacional: number; mes_pico: number; mes_valle: number; indice_mes: number[] }[];
  stl: { categoria_slug: string; puntos: { periodo: string; observado: number; tendencia: number; estacional: number }[] }[];
  dia_semana: { categoria_slug: string; indice: number[]; dia_pico: string; v_cramer: number; fin_de_semana_pct: number }[];
  concentracion: { categoria_slug: string; municipios: number; gini: number; top10_pct: number; top10: { municipio: string; departamento: string; cantidad: number }[]; lorenz: { p: number; l: number }[] }[];
  correlaciones: { orden: string[]; celdas: { a: string; b: string; rho: number }[]; aristas: { a: string; b: string; rho: number }[]; ventana: [number, number] };
  tipologias: { k: number; departamentos: { departamento: string; grupo: number }[]; rasgos: Record<string, { altos: string[]; bajos: string[]; z: Record<string, number> }>; ventana: [number, number] };
  respuesta: { rho: number; p_valor: number; puntos: { departamento: string; capturas_100k: number; delitos_100k: number }[] };
}

export const catalogo = catalogoJson as Categoria[];
export const departamentos = departamentosJson as { cod_dpto: string; departamento: string; region: string; poblacion: number }[];
export const delitos = catalogo.filter((c) => c.dominio === "delitos").sort((a, b) => b.cantidad - a.cantidad);
export const operativos = catalogo.filter((c) => c.dominio === "operativos");
export const nombre = (slug: string) => catalogo.find((c) => c.categoria_slug === slug)?.categoria ?? slug;
export const nombreDepto = (cod: string) => departamentos.find((d) => d.cod_dpto === cod)?.departamento ?? cod;

/** Etiquetas cortas para ejes y leyendas. */
const CORTO: Record<string, string> = {
  "abigeato": "Abigeato", "amenazas": "Amenazas", "delitos-sexuales": "D. sexuales", "extorsion": "Extorsión",
  "homicidios": "Homicidios", "homicidios-transito": "Homicidios tránsito", "hurto-automotores": "Hurto automotores",
  "hurto-comercio": "Hurto comercio", "hurto-financieras": "Hurto financieras", "hurto-motos": "Hurto motos",
  "hurto-personas": "Hurto personas", "hurto-residencias": "Hurto residencias", "lesiones-personales": "Lesiones personales",
  "lesiones-transito": "Lesiones tránsito", "pirateria-terrestre": "Piratería terrestre", "secuestro": "Secuestro",
  "terrorismo": "Terrorismo", "violencia-intrafamiliar": "Violencia intrafamiliar", "capturas": "Capturas",
  "armas": "Armas incautadas", "droga": "Droga incautada", "motos": "Motos recuperadas", "vehiculos": "Vehículos recuperados",
};
export const corto = (slug: string) => CORTO[slug] ?? nombre(slug);

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const cache = new Map<string, Promise<unknown>>();

export function cargar<T>(archivo: string): Promise<T> {
  if (!cache.has(archivo)) {
    cache.set(archivo, fetch(`${base}/data/${archivo}.json`).then((r) => {
      if (!r.ok) throw new Error(`${archivo}: HTTP ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(archivo) as Promise<T>;
}

/** Hook: carga un JSON publicado (cacheado entre islas). */
export function useData<T>(archivo: string): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => { let vivo = true; cargar<T>(archivo).then((d) => vivo && setData(d)); return () => { vivo = false; }; }, [archivo]);
  return data;
}

export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
