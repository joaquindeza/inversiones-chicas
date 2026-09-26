"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sesion";
import { crearCliente } from "@/lib/supabase/server";

export type EstadoSync = { error?: string; ok?: string };

/** Dispara la Edge Function sync-iol con la sesión del admin. Responde enseguida; corre en segundo plano. */
export async function sincronizarAhora(): Promise<EstadoSync> {
  await exigirAdmin();
  const supabase = await crearCliente();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Tu sesión venció: volvé a entrar." };
  const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-iol`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ disparo: "manual" }),
  });
  const body = await r.json().catch(() => ({}));
  revalidatePath("/admin", "layout");
  if (r.status === 409) return { ok: "Ya había una sincronización en curso." };
  if (!r.ok) return { error: body.error ?? `Error ${r.status}` };
  return { ok: "Sincronizando…" };
}

export async function cambiarFrecuencia(frecuencia: "off" | "6h" | "diaria"): Promise<EstadoSync> {
  await exigirAdmin();
  const supabase = await crearCliente();
  const { error } = await supabase.rpc("configurar_sync", { p_frecuencia: frecuencia });
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: frecuencia === "off" ? "Sync automático apagado." : `Sync automático: ${frecuencia === "6h" ? "cada 6 horas" : "una vez por día"}.` };
}

/** Guarda usuario y clave de IOL de una hermana en Vault. Nunca se leen de vuelta. */
export async function guardarCredencial(_p: EstadoSync, f: FormData): Promise<EstadoSync> {
  await exigirAdmin();
  const hermana = Number(f.get("hermana_id"));
  const usuario = String(f.get("usuario") ?? "").trim();
  const clave = String(f.get("clave") ?? "");
  if (!hermana || !usuario || !clave) return { error: "Completá usuario y clave." };
  const supabase = await crearCliente();
  const { error } = await supabase.rpc("guardar_credencial_iol", { p_hermana: hermana, p_usuario: usuario, p_clave: clave });
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: "Guardada (cifrada)." };
}

export async function descartarAlerta(id: number): Promise<EstadoSync> {
  await exigirAdmin();
  const supabase = await crearCliente();
  const { error } = await supabase.from("alertas").update({ resuelta_el: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: "Listo." };
}
