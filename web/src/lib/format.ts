const nf0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export const num = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? "—" : nf0.format(v));
export const dec = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? "—" : nf1.format(v));
export const kmil = (v: number) => compact.format(v);
export const pct = (v: number | null | undefined, signo = false) =>
  v == null || Number.isNaN(v) ? "—" : `${signo && v > 0 ? "+" : ""}${nf1.format(v)} %`;
/** Gramos → toneladas. */
export const ton = (g: number) => `${nf0.format(g / 1e6)} t`;
