import { Dona } from "@/components/graficos";
import { Explicame } from "@/components/explicame";
import { Monto, Pct } from "@/components/preferencias";
import { categoriasHermana, posiciones, resumenes, tesis } from "@/lib/datos";
import { CATEGORIAS_CRIOLLO } from "@/lib/explicaciones";
import { hermanaDeLaVista } from "@/lib/vista";
import { esVisible, porcionesCategorias } from "@/lib/porciones";
import { Logo } from "@/components/logo";

export const metadata = { title: "En qué estoy invertida" };

export default async function MisInversiones() {
  const { id } = await hermanaDeLaVista();
  const [rs, pos, cats, ts] = await Promise.all([resumenes(), posiciones(id), categoriasHermana(id), tesis(id)]);
  const r = rs.find((x) => x.hermana_id === id);
  const total = Number(r?.total_usd ?? 0);
  const activas = pos.filter(esVisible);
  const tesisDe = new Map(ts.map((t) => [t.ticker, t]));
  const grupos = cats.filter((c) => Number(c.valor_usd) > 0.0001);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white shadow-sm p-5">
        <h1 className="font-bold text-lg mb-1">En qué está tu plata</h1>
        <p className="text-sm text-tenue mb-4">
          Repartida en {activas.length} inversiones distintas. <Explicame termino="diversificar">¿Por qué repartirla?</Explicame>
        </p>
        <Dona porciones={porcionesCategorias(grupos, pos, Number(r?.efectivo_usd ?? 0))} alto={180} />
      </section>

      {grupos.map((c) => {
        const deEsta = activas.filter((p) => p.categoria === c.categoria);
        return (
          <section key={c.categoria} className="rounded-2xl bg-white shadow-sm p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold flex items-center gap-2">
                <span className="size-3 rounded-sm" style={{ background: c.color! }} />{c.categoria}
              </h2>
              <span className="text-sm"><Pct valor={c.pct == null ? null : Number(c.pct)} /></span>
            </div>
            <p className="text-sm text-tenue mt-1">{CATEGORIAS_CRIOLLO[c.categoria!] ?? ""}</p>
            {c.categoria === "Disponibilidades" && (
              <p className="text-sm mt-3 flex justify-between"><span>Plata sin invertir</span><Monto usd={Number(r?.efectivo_usd ?? 0)} /></p>
            )}
            <ul className="mt-3 divide-y divide-borde/70">
              {deEsta.map((p) => {
                const t = tesisDe.get(p.ticker!);
                const pct = total ? Number(p.valor_usd) / total : null;
                return (
                  <li key={p.ticker} className="py-2">
                    <details className="group">
                      <summary className="list-none cursor-pointer flex items-center justify-between gap-2">
                        <span className="min-w-0 inline-flex items-center gap-2">
                          <Logo ticker={p.ticker!} color={p.categoria_color} tam={28} />
                          <span className="min-w-0"><b>{p.ticker}</b> <span className="text-sm text-tenue truncate">{p.nombre}</span></span>
                        </span>
                        <span className="text-right text-sm shrink-0">
                          <Monto usd={Number(p.valor_usd)} /><br />
                          <Pct valor={p.resultado_pct == null ? null : Number(p.resultado_pct)} signo className="text-xs" />
                        </span>
                      </summary>
                      <div className="mt-2 rounded-lg bg-fondo p-3 text-sm space-y-1.5">
                        <p>Es el <Pct valor={pct} /> de tu cartera. Tenés {Number(p.cantidad)} y pagaste en promedio{" "}
                          <Monto usd={Number(p.ppc_usd)} /> (<Explicame termino="PPC">PPC</Explicame>); hoy vale <Monto usd={Number(p.precio_usado)} />.</p>
                        {t ? (
                          <>
                            {t.por_que && <p><b>Por qué la compramos:</b> {t.por_que}</p>}
                            {t.horizonte && <p><b>Por cuánto tiempo:</b> {t.horizonte}</p>}
                            {t.cuando_vender && <p><b>Cuándo venderíamos:</b> {t.cuando_vender}</p>}
                          </>
                        ) : <p className="text-tenue">Joaquín todavía no escribió por qué eligió esta inversión.</p>}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
