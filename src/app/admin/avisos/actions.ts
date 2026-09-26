"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sesion";
import { crearCliente } from "@/lib/supabase/server";

export type Estado = { error?: string; ok?: string };

const num = (v: FormDataEntryValue | null) => {
  let s = String(v ?? "").trim();
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return Number(s);
};

/** Reglas: los % se cargan como porcentaje (5 = 5%); la de vencimientos, en días. */
export async function guardarReglas(_p: Estado, f: FormData): Promise<Estado> {
  await exigirAdmin();
  const supabase = await crearCliente();
  for (const tipo of ["desvio_categoria", "aporte_sin_registrar", "movimiento_posicion", "vencimiento_on"]) {
    const v = num(f.get(`umbral_${tipo}`));
    if (v != null && (Number.isNaN(v) || v < 0)) return { error: "Revisá los números." };
    const umbral = v == null ? null : tipo === "desvio_categoria" || tipo === "movimiento_posicion" ? v / 100 : v;
    const { error } = await supabase.from("reglas_alerta").update({ umbral, activa: f.get(`activa_${tipo}`) === "on" }).eq("tipo", tipo);
    if (error) return { error: error.message };
  }
  revalidatePath("/admin", "layout");
  return { ok: "Reglas guardadas." };
}

export async function agregarEvento(_p: Estado, f: FormData): Promise<Estado> {
  await exigirAdmin();
  const fecha = String(f.get("fecha") ?? "");
  const descripcion = String(f.get("descripcion") ?? "").trim();
  if (!fecha || !descripcion) return { error: "Poné fecha y descripción." };
  const supabase = await crearCliente();
  const { error } = await supabase.from("eventos").insert({
    fecha, descripcion, ticker: String(f.get("ticker") ?? "").trim().toUpperCase() || null,
  });
  if (error) return { error: error.code === "23503" ? "Ese ticker no está en el catálogo." : error.message };
  revalidatePath("/admin", "layout");
  return { ok: "Evento agregado." };
}

export async function borrarEvento(id: number): Promise<Estado> {
  await exigirAdmin();
  const supabase = await crearCliente();
  const { error } = await supabase.from("eventos").delete().eq("id", id);
  revalidatePath("/admin", "layout");
  return error ? { error: error.message } : { ok: "Borrado." };
}

export async function guardarPlan(_p: Estado, f: FormData): Promise<Estado> {
  await exigirAdmin();
  const hermana_id = Number(f.get("hermana_id"));
  const monto = num(f.get("monto"));
  const dia = Number(f.get("dia_mes"));
  const supabase = await crearCliente();
  if (!monto) {
    const { error } = await supabase.from("plan_aportes").delete().eq("hermana_id", hermana_id);
    revalidatePath("/admin", "layout");
    return error ? { error: error.message } : { ok: "Plan borrado." };
  }
  if (Number.isNaN(monto) || monto <= 0) return { error: "Monto inválido." };
  if (!(dia >= 1 && dia <= 28)) return { error: "El día va de 1 a 28." };
  const { error } = await supabase.from("plan_aportes").upsert({
    hermana_id, monto, dia_mes: dia,
    moneda: f.get("moneda") === "USD" ? "USD" : "ARS",
    aportante: f.get("aportante") === "Propio" ? "Propio" : "Joaquín",
    activo: f.get("activo") === "on",
    desde: String(f.get("desde") || new Date().toISOString().slice(0, 8) + "01"),
  });
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: "Plan guardado." };
}
