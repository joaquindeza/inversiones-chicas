import { redirect } from "next/navigation";
import { BotonesVista, MepProvider, Monto, Pct } from "@/components/preferencias";
import { mepActual, resumenes } from "@/lib/datos";
import { exigirSesion } from "@/lib/sesion";
import { salir } from "@/app/login/actions";

export const metadata = { title: "Mi cartera" };

// Versión mínima: la vista completa de cada hermana (celular, PWA) es la etapa 5.
export default async function MiCartera() {
  const p = await exigirSesion();
  if (p.rol === "admin") redirect("/admin");
  const [[r], mep] = await Promise.all([resumenes(), mepActual()]); // el RLS devuelve solo la suya
  if (!r) return <p className="p-6">No encontramos tu cartera.</p>;
  const color = r.color ?? "#0B2545";

  return (
    <MepProvider valor={mep.valor}>
      <main className="min-h-dvh text-white px-5 py-6" style={{ background: color }}>
        <div className="flex items-center justify-between mb-10">
          <p className="font-bold">Hola, {r.nombre}</p>
          <BotonesVista oscuro />
        </div>
        <p className="text-white/80">Tu cartera hoy vale</p>
        <p className="text-5xl font-black mt-1"><Monto usd={Number(r.total_usd)} className="text-white" /></p>
        <div className="grid grid-cols-2 gap-3 mt-8">
          <div className="rounded-xl bg-white/15 p-4">
            <p className="text-sm text-white/80">Se puso</p>
            <p className="text-xl font-bold"><Monto usd={Number(r.aportado_neto_usd)} ars={Number(r.aportado_neto_ars)} /></p>
          </div>
          <div className="rounded-xl bg-white/15 p-4">
            <p className="text-sm text-white/80">Ganó</p>
            <p className="text-xl font-bold"><Pct valor={r.rendimiento == null ? null : Number(r.rendimiento)} signo={false} /></p>
          </div>
        </div>
        <p className="text-sm text-white/70 mt-10">Muy pronto: en qué estás invertida, cómo viene creciendo y tu futuro.</p>
        <form action={salir} className="mt-8"><button className="text-sm text-white/70 underline">Salir</button></form>
      </main>
    </MepProvider>
  );
}
