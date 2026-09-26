import "server-only";
import { cookies } from "next/headers";
import { exigirSesion } from "@/lib/sesion";

/**
 * De quién es la vista /mi: la hermana logueada ve la suya (el RLS no le deja ver otra).
 * El admin puede previsualizar la de cualquiera (cookie puesta por /mi/ver/[id]).
 */
export async function hermanaDeLaVista(): Promise<{ id: number; esAdmin: boolean }> {
  const p = await exigirSesion();
  if (p.rol === "hermana") return { id: p.hermanaId!, esAdmin: false };
  const c = Number((await cookies()).get("ver_hermana")?.value);
  return { id: Number.isInteger(c) && c > 0 ? c : 1, esAdmin: true };
}
