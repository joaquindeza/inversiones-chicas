"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clienteAdmin } from "@/lib/supabase/admin";

export type EstadoBienvenida = { error?: string };

/** Solo se puede usar desde la compu de Joaquín (localhost) y mientras no exista el admin. */
export async function puedeConfigurar() {
  const host = (await headers()).get("host") ?? "";
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  if (!local || !process.env.SUPABASE_SECRET_KEY) return false;
  const { count } = await clienteAdmin().from("perfiles").select("user_id", { count: "exact", head: true }).eq("rol", "admin");
  return (count ?? 0) === 0;
}

/**
 * Configuración inicial: crea el usuario de Joaquín (email + clave) y el de cada hermana (PIN de 6
 * números). Los emails de ellas son alias del de Joaquín (vos+amparo@...), no reciben correos.
 */
export async function configurarInicio(_p: EstadoBienvenida, f: FormData): Promise<EstadoBienvenida> {
  if (!(await puedeConfigurar())) return { error: "La configuración inicial ya se hizo (o no estás en tu compu)." };

  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const clave = String(f.get("clave") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Revisá tu email." };
  if (clave.length < 10) return { error: "Tu clave tiene que tener al menos 10 caracteres." };
  if (clave !== String(f.get("clave2") ?? "")) return { error: "Tus dos claves no coinciden." };

  const admin = clienteAdmin();
  const { data: hermanas } = await admin.from("hermanas").select("id, nombre").order("orden");
  const pines = new Map<number, string>();
  for (const h of hermanas ?? []) {
    const pin = String(f.get(`pin_${h.id}`) ?? "");
    if (!/^\d{6}$/.test(pin)) return { error: `El PIN de ${h.nombre} tienen que ser 6 números.` };
    if (pin !== String(f.get(`pin2_${h.id}`) ?? "")) return { error: `Los dos PIN de ${h.nombre} no coinciden.` };
    pines.set(h.id, pin);
  }

  const crear = async (correo: string, password: string, perfil: { rol: "admin" | "hermana"; hermana_id: number | null }) => {
    const { data, error } = await admin.auth.admin.createUser({ email: correo, password, email_confirm: true });
    if (error) throw new Error(error.message);
    const { error: e2 } = await admin.from("perfiles").insert({ user_id: data.user.id, ...perfil });
    if (e2) throw new Error(e2.message);
  };

  try {
    await crear(email, clave, { rol: "admin", hermana_id: null });
    const [local, dominio] = email.split("@");
    const { data: existentes } = await admin.from("perfiles").select("hermana_id");
    for (const h of hermanas ?? []) {
      if (existentes?.some((p) => p.hermana_id === h.id)) continue;
      await crear(`${local.split("+")[0]}+${h.nombre.toLowerCase()}@${dominio}`, pines.get(h.id)!, { rol: "hermana", hermana_id: h.id });
    }
  } catch (e) {
    return { error: `No se pudo crear: ${(e as Error).message}` };
  }
  redirect("/login?listo=1");
}
