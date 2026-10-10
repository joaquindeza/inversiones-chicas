// Tipos y utilidades que comparten el editor del plan y el de la cartera ideal.

export type TickerInfo = {
  ticker: string; nombre: string; categoria: string | null; categoriaId: number | null; color: string | null;
  precio: number | null; moneda: string; cotizaCada: number; precioUsd: number | null;
  actualizado: string | null; precioFecha: string | null; cotizable: boolean;
};
export type Categoria = { id: number; nombre: string; color: string; objetivoViejo: number | null };

/** Número escrito a mano: acepta "1.234,5" y "1234.5". Vacío o inválido = 0. */
export const num = (s: string) => {
  let t = s.trim();
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

export const fecha = (iso: string) => iso.split("-").reverse().join("/");
