import Link from "next/link";
import { BotonesVista, MepProvider } from "@/components/preferencias";
import { hermanas, mepActual } from "@/lib/datos";
import { hermanaDeLaVista } from "@/lib/vista";
import { NavMi } from "./nav";

export const metadata = { title: "Mi cartera" };

export default async function MiLayout({ children }: LayoutProps<"/mi">) {
  const { id, esAdmin } = await hermanaDeLaVista();
  const [hs, mep] = await Promise.all([hermanas(), mepActual()]); // una hermana solo ve la suya
  const h = hs.find((x) => x.id === id);
  const color = h?.color ?? "#0B2545";

  return (
    <MepProvider valor={mep.valor}>
      <div className="min-h-dvh flex flex-col bg-fondo" style={{ "--color-h": color } as React.CSSProperties}>
        {esAdmin && (
          <div className="bg-marino text-white text-xs px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Vista previa: así la ve <b>{h?.nombre}</b>. Ver:</span>
            {hs.filter((x) => x.id !== id).map((x) => (
              <Link key={x.id} href={`/mi/ver/${x.id}`} className="underline">{x.nombre}</Link>
            ))}
            <Link href="/admin" className="underline ml-auto">← Volver al panel</Link>
          </div>
        )}
        <header className="text-white px-5 pt-5 pb-16" style={{ background: color }}>
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <p className="font-bold text-lg">Hola, {h?.nombre}</p>
            <BotonesVista oscuro />
          </div>
        </header>
        <main className="flex-1 -mt-12 px-4 pb-28 w-full max-w-xl mx-auto">{children}</main>
        <NavMi />
      </div>
    </MepProvider>
  );
}
