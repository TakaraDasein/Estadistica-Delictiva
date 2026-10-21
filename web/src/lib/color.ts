/** Roles de color: siempre por variable CSS (cambian con el tema). */
export const SERIE = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];

/** Familias de delito → slot categórico fijo (el color sigue a la entidad, no al rango). */
export const FAMILIA_COLOR: Record<string, string> = {
  "Patrimonio urbano": SERIE[0],
  "Vida e integridad": SERIE[1],
  "Libertad y seguridad": SERIE[2],
  "Seguridad vial": SERIE[3],
  "Patrimonio rural": SERIE[4],
  "Resultados operativos": SERIE[6],
};

/** Lee el valor resuelto de un token (para canvas / three.js). */
export function token(nombre: string): string {
  if (typeof window === "undefined") return "#888";
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || "#888";
}

export const SEQ = ["--seq-100", "--seq-200", "--seq-300", "--seq-400", "--seq-500", "--seq-600", "--seq-700"];

/** Rampa secuencial azul en 7 cuantiles (claro → oscuro). */
export function rampaSeq(valores: number[]) {
  const ord = valores.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const cortes = SEQ.slice(1).map((_, i) => ord[Math.floor(((i + 1) / SEQ.length) * (ord.length - 1))]);
  return (v: number | undefined) => {
    if (v == null || !Number.isFinite(v)) return "var(--surface-2)";
    const i = cortes.findIndex((c) => v <= c);
    return `var(${SEQ[i === -1 ? SEQ.length - 1 : i]})`;
  };
}
