import "server-only";
import { cache } from "react";
import { crearCliente } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

// Lecturas con la sesión del usuario: el RLS decide qué filas ve cada uno.

type Vista<N extends keyof Database["public"]["Views"]> = Database["public"]["Views"][N]["Row"];
type Tabla<N extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][N]["Row"];

export type Resumen = Vista<"v_resumen_hermana">;
export type Posicion = Vista<"v_posiciones">;
export type CategoriaHermana = Vista<"v_categorias_hermana">;
export type MesSeguimiento = Vista<"v_seguimiento">;
export type MovimientoV = Vista<"v_movimientos">;
export type TickerV = Vista<"v_tickers">;
export type Hermana = Tabla<"hermanas">;
export type TipoMovimiento = Database["public"]["Enums"]["tipo_movimiento"];
export type Aportante = Database["public"]["Enums"]["aportante"];

type Respuesta = { data: unknown; error: { message: string } | null };
/** Filas de una consulta (nunca null) o tira el error de la base. */
function lista<R extends Respuesta>(r: R): NonNullable<R["data"]> {
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as NonNullable<R["data"]>;
}
/** Una fila o null. */
function uno<R extends Respuesta>(r: R): R["data"] {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export const mepActual = cache(async () => {
  const s = await crearCliente();
  const r = uno(await s.from("v_mep_actual").select("valor, fecha").maybeSingle());
  return { valor: Number(r?.valor ?? 0), fecha: r?.fecha ?? null };
});

export const hermanas = cache(async () => {
  const s = await crearCliente();
  return lista(await s.from("hermanas").select("*").order("orden"));
});

export const resumenes = cache(async () => {
  const s = await crearCliente();
  return lista(await s.from("v_resumen_hermana").select("*").order("orden"));
});

export async function posiciones(hermanaId: number) {
  const s = await crearCliente();
  return lista(await s.from("v_posiciones").select("*").eq("hermana_id", hermanaId).order("valor_usd", { ascending: false }));
}

export async function categoriasHermana(hermanaId: number) {
  const s = await crearCliente();
  return lista(await s.from("v_categorias_hermana").select("*").eq("hermana_id", hermanaId).order("orden"));
}

export async function categoriasTodas() {
  const s = await crearCliente();
  return lista(await s.from("v_categorias_hermana").select("*").order("orden"));
}

export async function seguimiento(hermanaId?: number) {
  const s = await crearCliente();
  let q = s.from("v_seguimiento").select("*").order("mes");
  if (hermanaId) q = q.eq("hermana_id", hermanaId);
  return lista(await q);
}

export type FiltroMovimientos = { hermana?: number; tipo?: TipoMovimiento; desde?: string; hasta?: string; ticker?: string };

export async function movimientos(f: FiltroMovimientos = {}, limite = 500) {
  const s = await crearCliente();
  let q = s.from("v_movimientos").select("*").order("fecha", { ascending: false }).order("id", { ascending: false }).limit(limite);
  if (f.hermana) q = q.eq("hermana_id", f.hermana);
  if (f.tipo) q = q.eq("tipo", f.tipo);
  if (f.desde) q = q.gte("fecha", f.desde);
  if (f.hasta) q = q.lte("fecha", f.hasta);
  if (f.ticker) q = q.eq("ticker", f.ticker.toUpperCase());
  return lista(await q);
}

export const tickers = cache(async () => {
  const s = await crearCliente();
  return lista(await s.from("v_tickers").select("*").order("ticker"));
});

export const categorias = cache(async () => {
  const s = await crearCliente();
  return lista(await s.from("categorias").select("*").order("orden"));
});

export const plataformas = cache(async () => {
  const s = await crearCliente();
  return lista(await s.from("plataformas").select("nombre").order("orden")).map((p) => p.nombre);
});

export async function ultimoSync() {
  const s = await crearCliente();
  return uno(await s.from("sync_log").select("*").order("inicio", { ascending: false }).limit(1).maybeSingle());
}

export async function alertasPendientes() {
  const s = await crearCliente();
  return lista(await s.from("alertas").select("*").is("resuelta_el", null).order("creada", { ascending: false }));
}

export async function reglas() {
  const s = await crearCliente();
  return lista(await s.from("reglas_alerta").select("*"));
}

/** Total de las tres (o de las visibles) sumando los resúmenes. */
export function sumarResumenes(rs: Resumen[]) {
  const t = (k: keyof Resumen) => rs.reduce((a, r) => a + Number(r[k] ?? 0), 0);
  const aportado = t("aportado_neto_usd");
  const total = t("total_usd");
  return {
    aportado, total, resultado: total - aportado, rendimiento: aportado > 0 ? total / aportado - 1 : null,
    aportadoArs: t("aportado_neto_ars"), efectivo: t("efectivo_usd"), posiciones: t("valor_posiciones_usd"),
    joaquin: t("aportes_joaquin_usd"), propio: t("aportes_propio_usd"), regalo: t("aportes_regalo_usd"),
  };
}
