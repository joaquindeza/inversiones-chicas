import type { MovimientoV, Posicion } from "@/lib/datos";

// Historial por posición: todo lo que se compró, vendió y cobró de cada ticker, y cuánto dejó.

export type Operacion = { fecha: string; tipo: string; cantidad: number | null; usd: number; precio: number | null };
export type FilaHistorial = {
  hermana_id: number; ticker: string; nombre: string; categoria: string; color: string;
  abierta: boolean; cantidad: number; primera: string; ultima: string;
  invertido: number; vendido: number; cobrado: number; valorActual: number;
  resultado: number; rendimiento: number | null; operaciones: Operacion[];
};

export function historial(movs: MovimientoV[], pos: Posicion[]): FilaHistorial[] {
  const grupos = new Map<string, MovimientoV[]>();
  for (const m of movs) {
    if (!m.ticker || !["Compra", "Venta", "Ingreso de títulos", "Renta/Dividendo"].includes(m.tipo!)) continue;
    const k = `${m.hermana_id}|${m.ticker}`;
    grupos.set(k, [...(grupos.get(k) ?? []), m]);
  }
  const posDe = new Map(pos.map((p) => [`${p.hermana_id}|${p.ticker}`, p]));
  const filas: FilaHistorial[] = [];
  for (const [k, ms] of grupos) {
    const orden = [...ms].sort((a, b) => (a.fecha! < b.fecha! ? -1 : 1));
    const suma = (tipos: string[]) => orden.filter((m) => tipos.includes(m.tipo!)).reduce((a, m) => a + Number(m.monto_usd), 0);
    const p = posDe.get(k);
    const invertido = suma(["Compra", "Ingreso de títulos"]);
    const vendido = suma(["Venta"]);
    const cobrado = suma(["Renta/Dividendo"]);
    const valorActual = p?.activa ? Number(p.valor_usd) : 0;
    const resultado = vendido + cobrado + valorActual - invertido;
    filas.push({
      hermana_id: orden[0].hermana_id!, ticker: orden[0].ticker!, nombre: p?.nombre ?? orden[0].ticker!,
      categoria: p?.categoria ?? "Otros", color: p?.categoria_color ?? "#9CA3AF",
      abierta: !!p?.activa, cantidad: Number(p?.cantidad ?? 0),
      primera: orden[0].fecha!, ultima: orden[orden.length - 1].fecha!,
      invertido, vendido, cobrado, valorActual, resultado,
      rendimiento: invertido > 0 ? resultado / invertido : null,
      operaciones: orden.map((m) => ({
        fecha: m.fecha!, tipo: m.tipo!, cantidad: m.cantidad == null ? null : Number(m.cantidad),
        usd: Number(m.monto_usd), precio: m.precio_unit_usd == null ? null : Number(m.precio_unit_usd),
      })),
    });
  }
  // primero las abiertas (de mayor a menor valor), después las cerradas (las últimas primero)
  return filas.sort((a, b) => (a.abierta !== b.abierta ? (a.abierta ? -1 : 1)
    : a.abierta ? b.valorActual - a.valorActual : b.ultima.localeCompare(a.ultima)));
}
