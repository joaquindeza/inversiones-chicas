import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { crearCliente } from "@/lib/supabase/server";

export type Perfil = { userId: string; rol: "admin" | "hermana"; hermanaId: number | null };

/** Perfil del usuario logueado (o null). Verifica el JWT con getClaims. */
export const perfilActual = cache(async (): Promise<Perfil | null> => {
  const supabase = await crearCliente();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: p } = await supabase.from("perfiles").select("rol, hermana_id").eq("user_id", userId).maybeSingle();
  if (!p) return null;
  return { userId, rol: p.rol, hermanaId: p.hermana_id };
});

export async function exigirAdmin(): Promise<Perfil> {
  const p = await perfilActual();
  if (!p) redirect("/login");
  if (p.rol !== "admin") redirect("/mi");
  return p;
}

export async function exigirSesion(): Promise<Perfil> {
  const p = await perfilActual();
  if (!p) redirect("/login");
  return p;
}
