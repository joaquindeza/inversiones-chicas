"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { clienteAdmin } from "@/lib/supabase/admin";
import { crearCliente } from "@/lib/supabase/server";

const VENTANA_MIN = 15;
const MAX_FALLOS_PERFIL = 5;
const MAX_FALLOS_IP = 20;

export type EstadoLogin = { error?: string };

/**
 * Login por perfil: el cliente solo manda qué perfil eligió y el PIN/clave. El email (sintético)
 * nunca sale del servidor. Bloquea el perfil tras 5 intentos fallidos en 15 minutos.
 */
export async function ingresar(_prev: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const perfil = String(form.get("perfil") ?? "");
  const clave = String(form.get("clave") ?? "");
  const esAdmin = perfil === "admin";
  const hermanaId = esAdmin ? null : Number(perfil);
  if (!esAdmin && !Number.isInteger(hermanaId)) return { error: "Elegí un perfil." };
  if (!clave) return { error: "Falta la clave." };

  const admin = clienteAdmin();
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const desde = new Date(Date.now() - VENTANA_MIN * 60_000).toISOString();

  // las tres consultas previas van en paralelo (antes eran una detrás de la otra)
  let q = admin.from("intentos_login").select("id", { count: "exact", head: true }).eq("ok", false).gte("creado_el", desde);
  q = esAdmin ? q.eq("es_admin", true) : q.eq("hermana_id", hermanaId!);
  let pq = admin.from("perfiles").select("user_id");
  pq = esAdmin ? pq.eq("rol", "admin") : pq.eq("hermana_id", hermanaId!);
  const [{ count: fallosPerfil }, { count: fallosIp }, { data: p }] = await Promise.all([
    q,
    admin.from("intentos_login").select("id", { count: "exact", head: true }).eq("ok", false).eq("ip", ip).gte("creado_el", desde),
    pq.limit(1).maybeSingle(),
  ]);
  if ((fallosPerfil ?? 0) >= MAX_FALLOS_PERFIL || (fallosIp ?? 0) >= MAX_FALLOS_IP) {
    return { error: `Demasiados intentos. Probá de nuevo en ${VENTANA_MIN} minutos.` };
  }
  const email = p ? (await admin.auth.admin.getUserById(p.user_id)).data.user?.email : undefined;

  const supabase = await crearCliente();
  const { error } = email
    ? await supabase.auth.signInWithPassword({ email, password: clave })
    : { error: new Error("sin usuario") };

  // el registro del intento no demora la respuesta: se guarda después de contestar
  after(async () => {
    await admin.from("intentos_login").insert({ hermana_id: hermanaId, es_admin: esAdmin, ok: !error, ip });
  });
  if (error) return { error: esAdmin ? "Clave incorrecta." : "PIN incorrecto." };

  redirect(esAdmin ? "/admin" : "/mi");
}

export async function salir() {
  const supabase = await crearCliente();
  await supabase.auth.signOut();
  redirect("/login");
}
