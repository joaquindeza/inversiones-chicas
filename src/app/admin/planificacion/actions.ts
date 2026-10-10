"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sesion";
import { crearCliente } from "@/lib/supabase/server";

/** Compra del plan en nominales. `pct` (% del nivel) solo viene en los planes viejos, cargados por %. */
export type ItemPlan = { nivel: "Bajo" | "Medio" | "Alto"; ticker: string; cantidad: number | null; precioArs: number | null; pct: number | null; categoriaId: number | null };
export type VentaPlan = { ticker: string; cantidad: number; precioArs: number | null };
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
  const items = plan.items.filter((i) => i.ticker.trim() && (i.cantidad ?? 0) > 0);
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
      ...items.map((i, k) => ({
        plan_id: p.id, nivel: i.nivel, ticker: i.ticker.trim().toUpperCase(), cantidad: i.cantidad, precio_ars: i.precioArs,
        pct_nivel: i.pct == null ? null : Math.min(1, Math.max(0, i.pct / 100)), orden: k,
      })),
      ...ventas.map((v, k) => ({ plan_id: p.id, nivel: "Venta" as const, ticker: v.ticker.trim().toUpperCase(), cantidad: v.cantidad, precio_ars: v.precioArs, orden: k })),
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

// ------------------------------------------------------------------ cartera ideal

export type Ideal = {
  vigenteDesde: string;
  categorias: { categoriaId: number; pct: number }[];          // % de la cartera, de 0 a 100
  items: { ticker: string; categoriaId: number; pct: number }[]; // % de su categoría, de 0 a 100
};

/** Guarda la ideal como una versión vigente desde `vigenteDesde` (si ya había una ese día, la reemplaza). */
export async function guardarIdeal(hermanas: number[], ideal: Ideal): Promise<Estado> {
  await exigirAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ideal.vigenteDesde)) return { error: "Fecha de vigencia inválida." };
  const cats = ideal.categorias.filter((c) => c.pct > 0);
  const suma = cats.reduce((a, c) => a + c.pct, 0);
  if (Math.abs(suma - 100) > 0.01) return { error: `Las categorías suman ${+suma.toFixed(2)}%: tienen que dar 100%.` };
  const items = ideal.items.filter((i) => i.ticker.trim() && i.pct > 0).map((i) => ({ ...i, ticker: i.ticker.trim().toUpperCase() }));
  if (new Set(items.map((i) => i.ticker)).size !== items.length) return { error: "Hay un ticker repetido." };
  for (const c of cats) {
    const s = items.filter((i) => i.categoriaId === c.categoriaId).reduce((a, i) => a + i.pct, 0);
    if (s > 0 && Math.abs(s - 100) > 0.01) return { error: `Los tickers de una categoría suman ${+s.toFixed(2)}%: tienen que dar 100%.` };
  }
  if (items.some((i) => !cats.some((c) => c.categoriaId === i.categoriaId))) return { error: "Hay tickers en una categoría con 0%." };

  const supabase = await crearCliente();
  // tickers nuevos: al catálogo, con la categoría donde se cargaron
  const { data: existentes } = await supabase.from("tickers").select("ticker, categoria_id").in("ticker", items.map((i) => i.ticker));
  const ya = new Map((existentes ?? []).map((t) => [t.ticker, t.categoria_id]));
  const otraCat = items.filter((i) => ya.has(i.ticker) && ya.get(i.ticker) != null && ya.get(i.ticker) !== i.categoriaId);
  if (otraCat.length) return { error: `${otraCat.map((i) => i.ticker).join(", ")} está en otra categoría del catálogo.` };
  const nuevos = items.filter((i) => !ya.has(i.ticker));
  if (nuevos.length) {
    const { error } = await supabase.from("tickers").insert(nuevos.map((i) => ({
      ticker: i.ticker, nombre: i.ticker, categoria_id: i.categoriaId, plataforma: "IOL", cotiza_cada: i.categoriaId === 1 ? 100 : 1,
    })));
    if (error) return { error: error.message };
  }

  for (const h of hermanas) {
    const { data: v, error } = await supabase.from("ideales").upsert(
      { hermana_id: h, vigente_desde: ideal.vigenteDesde, guardado_el: new Date().toISOString() },
      { onConflict: "hermana_id,vigente_desde" },
    ).select("id").single();
    if (error || !v) return { error: error?.message ?? "No se pudo guardar." };
    await supabase.from("ideal_categorias").delete().eq("ideal_id", v.id);
    await supabase.from("ideal_items").delete().eq("ideal_id", v.id);
    const { error: e1 } = await supabase.from("ideal_categorias").insert(cats.map((c) => ({ ideal_id: v.id, categoria_id: c.categoriaId, pct: c.pct / 100 })));
    if (e1) return { error: e1.message };
    if (items.length) {
      const { error: e2 } = await supabase.from("ideal_items").insert(items.map((i, k) => ({ ideal_id: v.id, ticker: i.ticker, pct_categoria: i.pct / 100, orden: k })));
      if (e2) return { error: e2.message };
    }
  }
  revalidatePath("/admin", "layout");
  return { ok: hermanas.length > 1 ? "Cartera ideal guardada para las tres." : "Cartera ideal guardada." };
}

export async function borrarIdeal(hermana: number, vigenteDesde: string): Promise<Estado> {
  await exigirAdmin();
  const supabase = await crearCliente();
  const { error } = await supabase.from("ideales").delete().eq("hermana_id", hermana).eq("vigente_desde", vigenteDesde);
  revalidatePath("/admin", "layout");
  return error ? { error: error.message } : { ok: "Versión borrada." };
}

// ------------------------------------------------------------------ precios

/** Pide a IOL (Edge Function cotizar-iol, solo lectura) el último precio de estos tickers y lo guarda en el catálogo. */
export async function refrescarPrecios(tickers: string[]): Promise<Estado & { actualizados?: number }> {
  await exigirAdmin();
  const lista = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))].slice(0, 60);
  if (!lista.length) return { actualizados: 0 };
  const supabase = await crearCliente();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Tu sesión venció: volvé a entrar." };
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cotizar-iol`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tickers: lista }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) return { error: `No se pudieron traer los precios: ${body.error ?? r.status}` };
  revalidatePath("/admin", "layout");
  const errores = (body.errores ?? []) as string[];
  return { actualizados: (body.precios ?? []).length, error: errores.length ? `Sin precio: ${errores.join(", ")}` : undefined };
}
