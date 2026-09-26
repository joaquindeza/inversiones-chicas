"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sesion";
import { crearCliente } from "@/lib/supabase/server";

export type ItemPlan = { nivel: "Bajo" | "Medio" | "Alto"; ticker: string; pct: number; categoriaId: number | null };
export type VentaPlan = { ticker: string; cantidad: number };
export type Plan = {
  mes: string; capital: number; tc: number; origen: "Aporte nuevo" | "Efectivo disponible";
  pctNivel: { Bajo: number; Medio: number; Alto: number }; items: ItemPlan[]; ventas: VentaPlan[];
};
export type Estado = { error?: string; ok?: string };

/** Guarda el plan del mes para una o varias hermanas (reemplaza lo que hubiera). Los % llegan de 0 a 100. */
export async function guardarPlan(hermanas: number[], plan: Plan): Promise<Estado> {
  await exigirAdmin();
  if (!/^\d{4}-\d{2}-01$/.test(plan.mes)) return { error: "Mes inválido." };
  if (!(plan.capital >= 0)) return { error: "El capital tiene que ser un número." };
  if (!(plan.tc > 0)) return { error: "Falta el tipo de cambio." };
  const items = plan.items.filter((i) => i.ticker.trim());
  const ventas = plan.ventas.filter((v) => v.ticker.trim() && v.cantidad > 0);
  const supabase = await crearCliente();

  // tickers nuevos: se agregan al catálogo con la categoría elegida en la fila
  const tickers = [...new Set([...items.map((i) => i.ticker), ...ventas.map((v) => v.ticker)].map((t) => t.trim().toUpperCase()))];
  const { data: existentes } = await supabase.from("tickers").select("ticker").in("ticker", tickers);
  const ya = new Set((existentes ?? []).map((t) => t.ticker));
  const faltan = items.filter((i) => !ya.has(i.ticker.trim().toUpperCase()));
  const sinCategoria = faltan.filter((i) => !i.categoriaId).map((i) => i.ticker.toUpperCase());
  if (sinCategoria.length) return { error: `Elegí la categoría de ${[...new Set(sinCategoria)].join(", ")} (es un ticker nuevo).` };
  if (ventas.some((v) => !ya.has(v.ticker.trim().toUpperCase()))) return { error: "Hay una venta de un ticker que no está en el catálogo." };
  if (faltan.length) {
    const nuevos = [...new Map(faltan.map((i) => [i.ticker.trim().toUpperCase(), i])).values()];
    const { error } = await supabase.from("tickers").insert(nuevos.map((i) => ({
      ticker: i.ticker.trim().toUpperCase(), nombre: i.ticker.trim().toUpperCase(), categoria_id: i.categoriaId,
      plataforma: "IOL", cotiza_cada: i.categoriaId === 1 ? 100 : 1,
    })));
    if (error) return { error: error.message };
  }

  for (const h of hermanas) {
    const { data: p, error } = await supabase.from("planes").upsert({
      hermana_id: h, mes: plan.mes, capital_ars: plan.capital, mep: plan.tc, origen_fondos: plan.origen,
      pct_bajo: plan.pctNivel.Bajo / 100, pct_medio: plan.pctNivel.Medio / 100, pct_alto: plan.pctNivel.Alto / 100,
      guardado_el: new Date().toISOString(),
    }, { onConflict: "hermana_id,mes" }).select("id").single();
    if (error || !p) return { error: error?.message ?? "No se pudo guardar." };
    await supabase.from("plan_items").delete().eq("plan_id", p.id);
    const filas = [
      ...items.map((i, k) => ({ plan_id: p.id, nivel: i.nivel, ticker: i.ticker.trim().toUpperCase(), pct_nivel: i.pct / 100, orden: k })),
      ...ventas.map((v, k) => ({ plan_id: p.id, nivel: "Venta" as const, ticker: v.ticker.trim().toUpperCase(), cantidad: v.cantidad, orden: k })),
    ];
    if (filas.length) {
      const { error: e2 } = await supabase.from("plan_items").insert(filas);
      if (e2) return { error: e2.message };
    }
  }
  revalidatePath("/admin/planificacion");
  return { ok: hermanas.length > 1 ? "Plan guardado para las tres." : "Plan guardado." };
}

export async function borrarPlan(hermana: number, mes: string): Promise<Estado> {
  await exigirAdmin();
  const supabase = await crearCliente();
  const { error } = await supabase.from("planes").delete().eq("hermana_id", hermana).eq("mes", mes);
  revalidatePath("/admin/planificacion");
  return error ? { error: error.message } : { ok: "Plan borrado." };
}
