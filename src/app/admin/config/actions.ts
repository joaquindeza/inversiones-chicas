"use server";

import { exigirAdmin } from "@/lib/sesion";
import { clienteAdmin } from "@/lib/supabase/admin";

export type Estado = { error?: string; ok?: string };

/** Cambia el PIN de una hermana (6 dígitos) o la clave del admin. Nunca se lee de vuelta. */
export async function cambiarClave(_p: Estado, f: FormData): Promise<Estado> {
  const yo = await exigirAdmin();
  const perfil = String(f.get("perfil") ?? "");
  const clave = String(f.get("clave") ?? "");
  const esAdmin = perfil === "admin";
  if (esAdmin ? clave.length < 10 : !/^\d{6}$/.test(clave))
    return { error: esAdmin ? "Tu clave tiene que tener al menos 10 caracteres." : "El PIN son 6 números." };
  if (clave !== String(f.get("repetir") ?? "")) return { error: "No coinciden." };

  const admin = clienteAdmin();
  let userId = yo.userId;
  if (!esAdmin) {
    const { data } = await admin.from("perfiles").select("user_id").eq("hermana_id", Number(perfil)).maybeSingle();
    if (!data) return { error: "Esa hermana no tiene usuario todavía (corré npm run crear-usuarios)." };
    userId = data.user_id;
  }
  const { error } = await admin.auth.admin.updateUserById(userId, { password: clave });
  if (error) return { error: error.message };
  return { ok: esAdmin ? "Clave cambiada." : "PIN cambiado." };
}
