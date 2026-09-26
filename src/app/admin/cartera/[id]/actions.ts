"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sesion";
import { crearCliente } from "@/lib/supabase/server";

export type EstadoTesis = { error?: string; ok?: string };

export async function guardarTesis(_p: EstadoTesis, f: FormData): Promise<EstadoTesis> {
  await exigirAdmin();
  const texto = (k: string) => String(f.get(k) ?? "").trim() || null;
  const supabase = await crearCliente();
  const { error } = await supabase.from("tesis").upsert({
    hermana_id: Number(f.get("hermana_id")), ticker: String(f.get("ticker")),
    por_que: texto("por_que"), horizonte: texto("horizonte"), cuando_vender: texto("cuando_vender"),
    actualizado: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  revalidatePath("/mi", "layout");
  return { ok: "Guardada." };
}
