import type { Moneda } from "@/lib/formato";

export type Preferencias = { oculto: boolean; moneda: Moneda };

export const PREFS_POR_DEFECTO: Preferencias = { oculto: false, moneda: "USD" };

/** Lee la cookie "prefs" (JSON). Cualquier cosa rara vuelve a los valores por defecto. */
export function leerPreferencias(valor: string | undefined): Preferencias {
  try {
    const p = JSON.parse(decodeURIComponent(valor ?? ""));
    return { oculto: p.oculto === true, moneda: p.moneda === "ARS" ? "ARS" : "USD" };
  } catch {
    return PREFS_POR_DEFECTO;
  }
}
