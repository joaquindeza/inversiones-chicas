"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sesion";
import { crearCliente } from "@/lib/supabase/server";

export type EstadoTicker = { error?: string; ok?: string };

const num = (v: FormDataEntryValue | null) => {
  let s = String(v ?? "").trim();
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return Number(s);
};

/** Alta o edición de un ticker del catálogo. El precio manual es para lo que no está en IOL. */
export async function guardarTicker(_prev: EstadoTicker, f: FormData): Promise<EstadoTicker> {
  await exigirAdmin();
  const ticker = String(f.get("ticker") ?? "").trim().toUpperCase();
  if (!ticker) return { error: "Falta el ticker." };
  const precio = num(f.get("precio"));
  const cotiza = num(f.get("cotiza_cada")) ?? 1;
  if (precio != null && (Number.isNaN(precio) || precio < 0)) return { error: "Precio inválido." };
  if (Number.isNaN(cotiza) || cotiza <= 0) return { error: "“Cotiza cada” tiene que ser mayor a 0." };

  const supabase = await crearCliente();
  const original = String(f.get("original") ?? "");
  const cambioPrecio = String(f.get("precio_original") ?? "") !== String(f.get("precio") ?? "");
  const fila = {
    ticker,
    nombre: String(f.get("nombre") ?? "").trim() || null,
    categoria_id: Number(f.get("categoria_id")) || null,
    plataforma: String(f.get("plataforma") ?? "") || null,
    moneda: String(f.get("moneda")) === "USD" ? ("USD" as const) : ("ARS" as const),
    precio,
    cotiza_cada: cotiza,
    ...(cambioPrecio ? { actualizado: new Date().toISOString(), fuente: "Manual" } : {}),
  };
  const { error } = original
    ? await supabase.from("tickers").update(fila).eq("ticker", original)
    : await supabase.from("tickers").insert(fila);
  if (error) return { error: error.code === "23505" ? `${ticker} ya existe.` : error.message };
  revalidatePath("/admin", "layout");
  return { ok: `${ticker} guardado.` };
}
