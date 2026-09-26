import type { Porcion } from "@/components/graficos";
import type { CategoriaHermana, Posicion } from "@/lib/datos";

/** Posiciones que se muestran: con cantidad y que valgan al menos US$ 1. */
export const esVisible = (p: Posicion) => !!p.activa && Number(p.valor_usd) >= 1;

/** Porciones por categoría con sus posiciones adentro (para abrir la torta de cada categoría). */
export function porcionesCategorias(cats: CategoriaHermana[], pos: Posicion[], efectivoUsd: number): Porcion[] {
  const visibles = pos.filter(esVisible);
  return cats.map((c) => ({
    nombre: c.categoria!, color: c.color!, usd: Number(c.valor_usd), pct: c.pct == null ? null : Number(c.pct),
    hijos: [
      ...(c.categoria === "Disponibilidades" && efectivoUsd > 0 ? [{ nombre: "Efectivo", usd: efectivoUsd }] : []),
      ...visibles.filter((p) => p.categoria === c.categoria).map((p) => ({ nombre: p.ticker!, usd: Number(p.valor_usd), logo: true })),
    ],
  }));
}
