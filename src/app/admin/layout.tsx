import { BotonesVista, MepProvider } from "@/components/preferencias";
import { hermanas, mepActual } from "@/lib/datos";
import { exigirAdmin } from "@/lib/sesion";
import { fmtFecha, fmtTC } from "@/lib/formato";
import { salir } from "@/app/login/actions";
import { Nav } from "./nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await exigirAdmin();
  const [mep, hs] = await Promise.all([mepActual(), hermanas()]);

  const links = [
    { href: "/admin", texto: "Inicio" },
    { href: "/admin/movimientos", texto: "Movimientos" },
    ...hs.map((h) => ({ href: `/admin/cartera/${h.id}`, texto: h.nombre, color: h.color })),
    { href: "/admin/tickers", texto: "Tickers" },
    { href: "/admin/avisos", texto: "Avisos" },
    { href: "/admin/config", texto: "Configuración" },
  ];

  return (
    <MepProvider valor={mep.valor}>
      <div className="flex min-h-dvh">
        <aside className="hidden md:flex w-56 shrink-0 flex-col bg-marino text-white">
          <div className="px-5 py-5 font-black text-lg leading-tight">Inversiones<br />Chicas</div>
          <Nav links={links} />
          <form action={salir} className="mt-auto p-4">
            <button className="text-sm text-white/60 hover:text-white">Salir</button>
          </form>
        </aside>
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-10 bg-fondo/90 backdrop-blur border-b border-borde">
            <div className="flex items-center gap-4 px-4 md:px-8 h-14">
              <details className="md:hidden relative">
                <summary className="list-none cursor-pointer font-bold text-marino">☰ Menú</summary>
                <div className="absolute mt-2 w-56 rounded-lg bg-marino text-white shadow-lg py-2">
                  <Nav links={links} />
                </div>
              </details>
              <p className="text-sm text-tenue ml-auto hidden sm:block">
                MEP <span className="num font-semibold text-tinta">{fmtTC(mep.valor)}</span>
                <span className="ml-1">({fmtFecha(mep.fecha)})</span>
              </p>
              <BotonesVista />
            </div>
          </header>
          <main className="flex-1 px-4 md:px-8 py-6 max-w-[1600px] w-full">{children}</main>
        </div>
      </div>
    </MepProvider>
  );
}
