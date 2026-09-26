import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/sesion";
import { clienteAdmin } from "@/lib/supabase/admin";
import { puedeConfigurar } from "@/app/bienvenida/actions";
import { SelectorPerfiles, type PerfilLogin } from "./selector";

export const metadata = { title: "Entrar · Inversiones Chicas" };

export default async function LoginPage() {
  const actual = await perfilActual();
  if (actual) redirect(actual.rol === "admin" ? "/admin" : "/mi");

  if (!process.env.SUPABASE_SECRET_KEY) {
    return (
      <main className="min-h-dvh bg-marino grid place-items-center px-4 text-white text-center">
        <p className="max-w-md">Falta configurar <code className="bg-white/10 px-1 rounded">SUPABASE_SECRET_KEY</code> en el servidor
          (en <code className="bg-white/10 px-1 rounded">.env.local</code> o en las variables de Vercel).</p>
      </main>
    );
  }

  // Primera vez (todavía no hay usuarios): a la pantalla de configuración inicial.
  if (await puedeConfigurar()) redirect("/bienvenida");

  // Solo nombre y color de los perfiles que tienen usuario creado. Nada más sale del servidor.
  const admin = clienteAdmin();
  const [{ data: hermanas }, { data: perfiles }] = await Promise.all([
    admin.from("hermanas").select("id, nombre, color").order("orden"),
    admin.from("perfiles").select("rol, hermana_id"),
  ]);
  const conUsuario = new Set((perfiles ?? []).map((p) => (p.rol === "admin" ? "admin" : String(p.hermana_id))));
  const lista: PerfilLogin[] = [
    ...(hermanas ?? []).map((h) => ({ clave: String(h.id), nombre: h.nombre, color: h.color, tipo: "pin" as const })),
    { clave: "admin", nombre: "Joaquín", color: "#0B2545", tipo: "clave" as const },
  ].filter((p) => conUsuario.has(p.clave));

  return (
    <main className="min-h-dvh bg-marino flex flex-col items-center justify-center px-4 py-10 text-white">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">¿Quién sos?</h1>
      <p className="text-white/60 mb-10 text-sm">Inversiones Chicas</p>
      {lista.length === 0 ? (
        <p className="text-white/80 max-w-sm text-center">
          Todavía no hay usuarios creados. Corré <code className="bg-white/10 px-1 rounded">npm run crear-usuarios</code>.
        </p>
      ) : (
        <SelectorPerfiles perfiles={lista} />
      )}
    </main>
  );
}
