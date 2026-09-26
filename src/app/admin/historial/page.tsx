import Link from "next/link";
import { Logo } from "@/components/logo";
import { Monto, Pct } from "@/components/preferencias";
import { Seccion, Tarjeta, Titulo, Vacio, td, th } from "@/components/ui";
import { hermanas, movimientos } from "@/lib/datos";
import { fmtCant, fmtFecha } from "@/lib/formato";
import { historial } from "@/lib/historial";
import { crearCliente } from "@/lib/supabase/server";

export default async function Historial({ searchParams }: PageProps<"/admin/historial">) {
  const sp = await searchParams;
  const hs = await hermanas();
  const elegida = Number(sp.h) || null;
  const s = await crearCliente();
  const [movs, { data: pos }] = await Promise.all([
    movimientos(elegida ? { hermana: elegida } : {}, 5000),
    (elegida ? s.from("v_posiciones").select("*").eq("hermana_id", elegida) : s.from("v_posiciones").select("*")),
  ]);
  const filas = historial(movs, pos ?? []);
  const nombre = new Map(hs.map((h) => [h.id, h]));
  const cerradas = filas.filter((f) => !f.abierta);
  const realizado = cerradas.reduce((a, f) => a + f.resultado, 0);
  const cobrado = filas.reduce((a, f) => a + f.cobrado, 0);

  return (
    <>
      <Titulo sub="Todas las posiciones que se tuvieron: cuándo se compraron y vendieron, cuánto se puso y cuánto dejaron.">Historial</Titulo>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {[{ id: null, nombre: "Las tres", color: "#0B2545" }, ...hs].map((h) => (
          <Link key={h.id ?? 0} href={h.id ? `/admin/historial?h=${h.id}` : "/admin/historial"}
            className={`rounded-full px-4 py-1.5 border ${elegida === h.id ? "text-white border-transparent" : "bg-white border-borde"}`}
            style={elegida === h.id ? { background: h.color } : undefined}>
            {h.nombre}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Tarjeta titulo="Posiciones abiertas">{filas.length - cerradas.length}</Tarjeta>
        <Tarjeta titulo="Posiciones cerradas">{cerradas.length}</Tarjeta>
        <Tarjeta titulo="Resultado de las cerradas" sub="lo que ya se ganó o perdió al vender"><Monto usd={realizado} signo /></Tarjeta>
        <Tarjeta titulo="Dividendos y rentas cobrados"><Monto usd={cobrado} /></Tarjeta>
      </div>

      <Seccion titulo={`${filas.length} posiciones`}>
        {filas.length === 0 ? <Vacio>Todavía no hay operaciones.</Vacio> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Ticker", ...(elegida ? [] : ["Hermana"]), "Estado", "Desde", "Hasta", "Cantidad hoy", "Invertido", "Vendido", "Cobrado", "Vale hoy", "Resultado", "%"].map((h, i) => (
                    <th key={h} className={`${th} ${i >= (elegida ? 5 : 6) ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              {filas.map((f) => {
                const h = nombre.get(f.hermana_id);
                return (
                  <tbody key={`${f.hermana_id}${f.ticker}`} className="group">
                    <tr className={f.abierta ? "" : "text-tenue"}>
                      <td className={td}>
                        <details className="inline-block align-middle">
                          <summary className="list-none cursor-pointer inline-flex items-center gap-2">
                            <Logo ticker={f.ticker} color={f.color} /><b className="text-tinta">{f.ticker}</b>
                            <span className="text-tenue truncate max-w-40">{f.nombre}</span>
                            <span className="text-xs text-marino">({f.operaciones.length} op.)</span>
                          </summary>
                          <table className="mt-2 mb-1 text-xs bg-fondo rounded">
                            <tbody>
                              {f.operaciones.map((o, i) => (
                                <tr key={i}>
                                  <td className="px-2 py-1 num">{fmtFecha(o.fecha)}</td>
                                  <td className="px-2 py-1">{o.tipo}</td>
                                  <td className="px-2 py-1 text-right num">{o.cantidad != null ? fmtCant(o.cantidad) : ""}</td>
                                  <td className="px-2 py-1 text-right"><Monto usd={o.usd} /></td>
                                  <td className="px-2 py-1 text-right text-tenue">{o.precio != null && <>a <Monto usd={o.precio} /></>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      </td>
                      {!elegida && <td className={td}><span style={{ color: h?.color }} className="font-semibold">{h?.nombre}</span></td>}
                      <td className={td}>{f.abierta ? <span className="text-sube font-semibold">Abierta</span> : "Cerrada"}</td>
                      <td className={`${td} num`}>{fmtFecha(f.primera)}</td>
                      <td className={`${td} num`}>{f.abierta ? "hoy" : fmtFecha(f.ultima)}</td>
                      <td className={`${td} text-right num`}>{f.abierta ? fmtCant(f.cantidad) : "—"}</td>
                      <td className={`${td} text-right`}><Monto usd={f.invertido} /></td>
                      <td className={`${td} text-right`}>{f.vendido ? <Monto usd={f.vendido} /> : "—"}</td>
                      <td className={`${td} text-right`}>{f.cobrado ? <Monto usd={f.cobrado} /> : "—"}</td>
                      <td className={`${td} text-right`}>{f.abierta ? <Monto usd={f.valorActual} /> : "—"}</td>
                      <td className={`${td} text-right font-semibold`}><Monto usd={f.resultado} signo /></td>
                      <td className={`${td} text-right`}><Pct valor={f.rendimiento} signo /></td>
                    </tr>
                  </tbody>
                );
              })}
            </table>
            <p className="text-xs text-tenue mt-2">
              Resultado = lo vendido + lo cobrado + lo que vale hoy − lo invertido (con comisiones). Tocá un ticker para ver sus operaciones.
            </p>
          </div>
        )}
      </Seccion>
    </>
  );
}
