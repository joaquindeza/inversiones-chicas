// Formatos en castellano rioplatense. Sirven en servidor y en cliente.

const usd = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ars = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("es-AR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const cant = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 6 });
const tc = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type Moneda = "USD" | "ARS";

export function fmtDinero(valor: number | null | undefined, moneda: Moneda = "USD"): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return moneda === "USD" ? `US$ ${usd.format(valor)}` : `$ ${ars.format(valor)}`;
}

export function fmtPct(valor: number | null | undefined, conSigno = false): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  const s = pct.format(valor);
  return conSigno && valor > 0 ? `+${s}` : s;
}

export const fmtCant = (v: number | null | undefined) => (v == null ? "—" : cant.format(v));
export const fmtTC = (v: number | null | undefined) => (v == null ? "—" : tc.format(v));

export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fmtMes(iso: string): string {
  const [a, m] = iso.slice(0, 7).split("-");
  return `${MESES[Number(m) - 1]} ${a.slice(2)}`;
}

export function fmtFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

/** Clase de color para ganancias/pérdidas. */
export const colorSigno = (v: number | null | undefined) =>
  v == null || Math.abs(v) < 1e-9 ? "" : v > 0 ? "text-sube" : "text-baja";
