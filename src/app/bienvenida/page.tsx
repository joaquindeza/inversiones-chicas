import { redirect } from "next/navigation";
import { clienteAdmin } from "@/lib/supabase/admin";
import { puedeConfigurar } from "./actions";
import { FormBienvenida } from "./form";

export const metadata = { title: "Configuración inicial · Inversiones Chicas" };

export default async function Bienvenida() {
  if (!(await puedeConfigurar())) redirect("/login");
  const { data: hermanas } = await clienteAdmin().from("hermanas").select("id, nombre, color").order("orden");
  return (
    <main className="min-h-dvh bg-fondo px-4 py-10">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-black text-marino">¡Bienvenido! Último paso</h1>
        <p className="text-tenue mt-2 mb-6">
          Completá esto una sola vez para crear las entradas a la app. Después vas a elegir tu perfil y poner tu clave;
          cada una de ellas elige el suyo y pone su PIN.
        </p>
        <FormBienvenida hermanas={hermanas ?? []} />
      </div>
    </main>
  );
}
