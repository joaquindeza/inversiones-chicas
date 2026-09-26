"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sesion";
import { crearCliente } from "@/lib/supabase/server";
import type { Aportante, TipoMovimiento } from "@/lib/datos";

export type EstadoForm = { error?: string; ok?: string; n?: number };

const TIPOS: TipoMovimiento[] = ["Aporte", "Retiro", "Compra", "Venta", "Renta/Dividendo", "Gasto/Comisión", "Ingreso de títulos"];
const CON_TICKER: TipoMovimiento[] = ["Compra", "Venta", "Ingreso de títulos"];
const APORTANTES: Aportante[] = ["Joaquín", "Propio", "Regalo"];

/** Acepta "1.234,56" (formato argentino) o "1234.56". */
const num = (v: FormDataEntryValue | null) => {
  let s = String(v ?? "").trim().replace(/\s/g, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return Number(s);
};

/** Alta o edición (si viene id). La base vuelve a validar con sus checks y el RLS exige admin. */
export async function guardarMovimiento(_prev: EstadoForm, f: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const tipo = String(f.get("tipo")) as TipoMovimiento;
  const ticker = String(f.get("ticker") ?? "").trim().toUpperCase() || null;
  const aportante = (String(f.get("aportante") ?? "") || null) as Aportante | null;
  const fila = {
    fecha: String(f.get("fecha") ?? ""),
    hermana_id: Number(f.get("hermana_id")),
    tipo,
    ticker: CON_TICKER.includes(tipo) || tipo === "Renta/Dividendo" ? ticker : null,
    cantidad: CON_TICKER.includes(tipo) ? num(f.get("cantidad")) : null,
    monto: num(f.get("monto")) ?? 0,
    moneda: String(f.get("moneda")) === "USD" ? ("USD" as const) : ("ARS" as const),
    tc_manual: num(f.get("tc_manual")),
    plataforma: String(f.get("plataforma") || "IOL"),
    aportante: tipo === "Aporte" ? aportante : null,
    nota: String(f.get("nota") ?? "").trim() || null,
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fila.fecha)) return { error: "Falta la fecha." };
  if (!fila.hermana_id) return { error: "Elegí la hermana." };
  if (!TIPOS.includes(tipo)) return { error: "Tipo inválido." };
  if (CON_TICKER.includes(tipo) && (!fila.ticker || !fila.cantidad || fila.cantidad <= 0))
    return { error: `Una ${tipo.toLowerCase()} necesita ticker y cantidad.` };
  if (Number.isNaN(fila.monto) || fila.monto < 0) return { error: "El monto tiene que ser un número positivo." };
  if (tipo === "Aporte" && (!aportante || !APORTANTES.includes(aportante))) return { error: "¿Quién hizo el aporte?" };
  if (fila.tc_manual != null && (Number.isNaN(fila.tc_manual) || fila.tc_manual <= 0)) return { error: "TC manual inválido." };

  const supabase = await crearCliente();
  const id = Number(f.get("id") || 0);
  const { error } = id
    ? await supabase.from("movimientos").update(fila).eq("id", id)
    : await supabase.from("movimientos").insert({ ...fila, origen: "Manual" });
  if (error) {
    if (error.code === "23503") return { error: `El ticker ${fila.ticker} no está en el catálogo: agregalo en Tickers.` };
    return { error: error.message };
  }
  revalidatePath("/admin", "layout");
  return { ok: id ? "Movimiento actualizado." : "Movimiento cargado.", n: Date.now() };
}

export async function borrarMovimiento(id: number): Promise<EstadoForm> {
  await exigirAdmin();
  const supabase = await crearCliente();
  const { error } = await supabase.from("movimientos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: "Movimiento borrado." };
}
