import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Cliente con la clave secreta: saltea RLS. Solo del lado del servidor y solo para lo que no puede
 * hacer el usuario (login por PIN, gestión de usuarios). Nunca pasarle datos de la base al cliente
 * sin filtrar.
 */
export function clienteAdmin() {
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!clave) throw new Error("Falta SUPABASE_SECRET_KEY en el entorno del servidor.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
