import { notFound } from "next/navigation";
import { BarraAportes, Dona, Evolucion } from "@/components/graficos";
import { Monto, Pct } from "@/components/preferencias";
import { Seccion, Tarjeta, Titulo, Vacio, td, th } from "@/components/ui";
import { categoriasHermana, posiciones, resumenes, seguimiento, tesis } from "@/lib/datos";
import { BotonTesis } from "./tesis";
import { Explicame } from "@/components/explicame";
import { serieEvolucion } from "@/lib/evolucion";
import { fmtCant, fmtPct } from "@/lib/formato";

const n = (v: number | null | undefined) => (v == null ? null : Number(v));

export default async function CarteraHermana({ params }: PageProps<"/admin/cartera/[id]">) {
  const id = Number((await params).id);
  const [rs, pos, cats, seg, ts] = await Promise.all([resumenes(), posiciones(id), categoriasHermana(id), seguimiento(id), tesis(id)]);
  const tesisDe = new Map(ts.map((t) => [t.ticker, t]));
  const r = rs.find((x) => x.hermana_id === id);
  if (!r) notFound();
  const color = r.color ?? "#0B2545";
  const total = Number(r.total_usd);
  const activas = pos.filter((p) => p.activa);

  return (
    <>
      <Titulo color={color} sub={<>
        Posiciones, composición y evolución. Todo en dólares MEP. ·{" "}
        <a href={`/mi/ver/${id}`} className="text-marino underline">Ver como la ve {r.nombre}</a> ·{" "}
        <a href={`/reporte/${id}`} target="_blank" className="text-marino underline">Reporte del mes (imagen)</a>
      </>}>Cartera de {r.nombre}</Titulo>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Tarjeta titulo="Vale hoy"><Monto usd={total} /></Tarjeta>
        <Tarjeta titulo={<Explicame termino="aportado">Aportado</Explicame>}><Monto usd={n(r.aportado_neto_usd)} ars={n(r.aportado_neto_ars)} /></Tarjeta>
        <Tarjeta titulo={<Explicame termino="resultado">Resultado</Explicame>}><Monto usd={n(r.resultado_usd)} signo /></Tarjeta>
        <Tarjeta titulo={<Explicame termino="rendimiento">Rendimiento</Explicame>} sub="sobre lo aportado"><Pct valor={n(r.rendimiento)} signo /></Tarjeta>
        <Tarjeta titulo="Efectivo" sub={<Pct valor={total ? Number(r.efectivo_usd) / total : null} />}>
          <Monto usd={n(r.efectivo_usd)} />
        </Tarjeta>
      </div>

      <Seccion titulo="Cuánto puso cada uno" className="mb-4">
        <BarraAportes partes={[
          { nombre: "Joaquín", usd: Number(r.aportes_joaquin_usd), color: "#0B2545" },
          { nombre: r.nombre!, usd: Number(r.aportes_propio_usd), color },
          { nombre: "Regalos", usd: Number(r.aportes_regalo_usd), color: "#9CA3AF" },
        ]} />
      </Seccion>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Seccion titulo="Por categoría">
          <Dona porciones={cats.map((c) => ({ nombre: c.categoria!, color: c.color!, usd: Number(c.valor_usd), pct: n(c.pct) }))} />
          <table className="w-full text-sm mt-4">
            <thead><tr><th className={th}>Categoría</th><th className={`${th} text-right`}>Real</th><th className={`${th} text-right`}>Objetivo</th><th className={`${th} text-right`}>Desvío</th></tr></thead>
            <tbody>
              {cats.filter((c) => c.objetivo_pct != null).map((c) => (
                <tr key={c.categoria}>
                  <td className={td}>{c.categoria}</td>
                  <td className={`${td} text-right`}><Pct valor={n(c.pct)} /></td>
                  <td className={`${td} text-right text-tenue`}>{fmtPct(n(c.objetivo_pct))}</td>
                  <td className={`${td} text-right num ${Math.abs(Number(c.desvio)) > 0.05 ? "text-aviso font-bold" : ""}`}>{fmtPct(n(c.desvio), true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Seccion>

        <Seccion titulo="Por ticker">
          {activas.length === 0 ? <Vacio>Sin posiciones.</Vacio> : (
            <ul className="space-y-2">
              {activas.map((p) => {
                const pct = total ? Number(p.valor_usd) / total : 0;
                return (
                  <li key={p.ticker} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span><b>{p.ticker}</b> <span className="text-tenue">{p.nombre}</span></span>
                      <span className="shrink-0"><Pct valor={pct} /> · <Monto usd={n(p.valor_usd)} className="text-tenue" /></span>
                    </div>
                    <div className="h-2 mt-1 rounded-full bg-fondo overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: p.categoria_color ?? color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Seccion>
      </div>

      <Seccion titulo="Posiciones" className="mb-4">
        {pos.length === 0 ? <Vacio>Sin posiciones.</Vacio> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Ticker", "Nombre", "Categoría", "Cantidad", <Explicame key="ppc" termino="PPC">PPC</Explicame>, "Precio", "Valor", "% cartera", "Ganancia", "%", "Tesis"].map((h, i) => (
                    <th key={i} className={`${th} ${i >= 3 && i < 10 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pos.map((p) => (
                  <tr key={p.ticker} className={p.activa ? "" : "text-tenue"}>
                    <td className={`${td} font-bold`}>{p.ticker}</td>
                    <td className={`${td} max-w-56 truncate`}>{p.nombre}</td>
                    <td className={td}><span className="inline-block size-2.5 rounded-sm mr-1.5" style={{ background: p.categoria_color! }} />{p.categoria}</td>
                    <td className={`${td} text-right num`}>{fmtCant(n(p.cantidad))}</td>
                    <td className={`${td} text-right`}><Monto usd={n(p.ppc_usd)} /></td>
                    <td className={`${td} text-right`}>
                      <Monto usd={n(p.precio_usado)} />
                      {p.precio_usd == null && <span className="text-aviso" title="Sin precio: se valoriza al PPC"> *</span>}
                    </td>
                    <td className={`${td} text-right font-semibold`}><Monto usd={n(p.valor_usd)} /></td>
                    <td className={`${td} text-right`}><Pct valor={total ? Number(p.valor_usd) / total : null} /></td>
                    <td className={`${td} text-right`}><Monto usd={n(p.resultado_usd)} signo /></td>
                    <td className={`${td} text-right`}><Pct valor={n(p.resultado_pct)} signo /></td>
                    <td className={td}>{p.activa && <BotonTesis hermanaId={id} ticker={p.ticker!} tesis={tesisDe.get(p.ticker!) ?? null} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-tenue mt-2">En gris, posiciones cerradas (cantidad 0). * sin precio actual: se valoriza al PPC.</p>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Evolución: lo aportado vs. lo que vale">
        <Evolucion puntos={serieEvolucion(seg)} color={color} />
      </Seccion>
    </>
  );
}
