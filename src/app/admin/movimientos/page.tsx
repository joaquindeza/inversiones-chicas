import { Seccion, Titulo } from "@/components/ui";
import { hermanas, movimientos, plataformas, tickers, type TipoMovimiento } from "@/lib/datos";
import { TablaMovimientos } from "./tabla";

const TIPOS: TipoMovimiento[] = ["Aporte", "Retiro", "Compra", "Venta", "Renta/Dividendo", "Gasto/Comisión", "Ingreso de títulos"];

export default async function Movimientos({ searchParams }: PageProps<"/admin/movimientos">) {
  const sp = await searchParams;
  const uno = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const filtro = {
    hermana: uno("hermana") ? Number(uno("hermana")) : undefined,
    tipo: TIPOS.includes(uno("tipo") as TipoMovimiento) ? (uno("tipo") as TipoMovimiento) : undefined,
    desde: uno("desde"),
    hasta: uno("hasta"),
    ticker: uno("ticker"),
  };
  const [movs, hs, tks, plats] = await Promise.all([movimientos(filtro), hermanas(), tickers(), plataformas()]);

  const campo = "rounded-md border border-borde bg-white px-2 py-1.5 text-sm";
  return (
    <>
      <Titulo sub="El libro único de las tres. Todo lo demás se calcula a partir de acá.">Movimientos</Titulo>

      <Seccion titulo="Filtrar" className="mb-4">
        <form className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">Hermana
            <select name="hermana" defaultValue={filtro.hermana ?? ""} className={campo}>
              <option value="">Todas</option>
              {hs.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">Tipo
            <select name="tipo" defaultValue={filtro.tipo ?? ""} className={campo}>
              <option value="">Todos</option>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">Ticker
            <input name="ticker" defaultValue={filtro.ticker ?? ""} className={`${campo} w-24 uppercase`} />
          </label>
          <label className="flex flex-col gap-1">Desde<input type="date" name="desde" defaultValue={filtro.desde ?? ""} className={campo} /></label>
          <label className="flex flex-col gap-1">Hasta<input type="date" name="hasta" defaultValue={filtro.hasta ?? ""} className={campo} /></label>
          <button className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold">Filtrar</button>
          <a href="/admin/movimientos" className="text-tenue hover:text-tinta py-1.5">Limpiar</a>
        </form>
      </Seccion>

      <TablaMovimientos
        movimientos={movs}
        hermanas={hs.map((h) => ({ id: h.id, nombre: h.nombre, color: h.color }))}
        tickers={tks.map((t) => ({ ticker: t.ticker!, nombre: t.nombre ?? "" }))}
        plataformas={plats}
      />
    </>
  );
}
