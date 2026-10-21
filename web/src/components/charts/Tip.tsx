import type { ReactNode } from "react";

export interface TipRow { color?: string; label: string; value: string }

/** Tooltip con texto en tinta (no en color de serie); el punto lleva la identidad. */
export function Tip({ title, rows, foot }: { title: ReactNode; rows: TipRow[]; foot?: ReactNode }) {
  return (
    <div className="tt">
      <div className="t">{title}</div>
      {rows.map((r) => (
        <div className="r" key={r.label}>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {r.color && <span className="dot" style={{ background: r.color }} />}
            {r.label}
          </span>
          <b>{r.value}</b>
        </div>
      ))}
      {foot && <div className="note" style={{ marginTop: 6 }}>{foot}</div>}
    </div>
  );
}

export const AXIS = { stroke: "var(--axis)", tick: { fill: "var(--muted)", fontSize: 12 }, tickLine: false } as const;

export function Seg<T extends string>({ value, options, onChange, label }: {
  value: T; options: [T, string][]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export function Cargando() {
  return <div className="loading">Cargando datos…</div>;
}
