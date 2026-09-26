import Link from "next/link";
import { BarraAportes } from "@/components/graficos";
import { BotonCompartir } from "@/components/compartir";
import { Explicame } from "@/components/explicame";
import { Monto, Pct } from "@/components/preferencias";
import { resumenes, seguimiento } from "@/lib/datos";
import { hermanaDeLaVista } from "@/lib/vista";
import { salir } from "@/app/login/actions";

export default async function MiCartera() {
  const { id, esAdmin } = await hermanaDeLaVista();
  const [rs, seg] = await Promise.all([resumenes(), seguimiento(id)]);
  const r = rs.find((x) => x.hermana_id === id);
  if (!r) return <p className="bg-white rounded-2xl p-6">Todavía no encontramos tu cartera.</p>;

  const total = Number(r.total_usd);
  const aportado = Number(r.aportado_neto_usd);
  const resultado = Number(r.resultado_usd);
  const rend = r.rendimiento == null ? null : Number(r.rendimiento);
  const esteMes = seg.find((m) => m.es_mes_actual);
  const cada100 = aportado > 0 ? (total / aportado) * 100 : null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white shadow-sm p-6 text-center">
        <p className="text-tenue">Tu cartera hoy vale</p>
        <p className="text-4xl sm:text-5xl font-black mt-1" style={{ color: "var(--color-h)" }}><Monto usd={total} /></p>
        {cada100 != null && (
          <p className="text-sm text-tenue mt-3">
            Por cada <b className="text-tinta">US$ 100</b> que se pusieron, hoy hay{" "}
            <b className="text-tinta"><Monto usd={cada100} /></b>.
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white shadow-sm p-4">
          <p className="text-sm text-tenue"><Explicame termino="aportado">Se puso</Explicame></p>
          <p className="text-xl font-bold mt-1"><Monto usd={aportado} ars={Number(r.aportado_neto_ars)} /></p>
        </div>
        <div className="rounded-2xl bg-white shadow-sm p-4">
          <p className="text-sm text-tenue"><Explicame termino="resultado">{resultado >= 0 ? "Ganó" : "Por ahora"}</Explicame></p>
          <p className="text-xl font-bold mt-1"><Monto usd={resultado} signo /></p>
          <p className="text-sm"><Pct valor={rend} signo /></p>
        </div>
      </section>

      {esteMes?.rendimiento_mes != null && (
        <section className="rounded-2xl bg-white shadow-sm p-4 flex items-center justify-between">
          <p className="text-sm">Este mes tu cartera</p>
          <p className="font-bold">
            {Number(esteMes.rendimiento_mes) >= 0 ? "subió " : "bajó "}
            <Pct valor={Math.abs(Number(esteMes.rendimiento_mes))} />
          </p>
        </section>
      )}

      <section className="rounded-2xl bg-white shadow-sm p-5">
        <h2 className="font-bold mb-1">¿Cuánto es tuyo?</h2>
        <p className="text-sm text-tenue mb-3">
          Hoy la mayor parte la puso Joaquín. Cuando empieces a trabajar y sumes lo tuyo, esta barra se va a ir llenando con tu color.
        </p>
        <BarraAportes partes={[
          { nombre: "Joaquín", usd: Number(r.aportes_joaquin_usd), color: "#0B2545" },
          { nombre: "Vos", usd: Number(r.aportes_propio_usd), color: r.color ?? "#999" },
          { nombre: "Regalos", usd: Number(r.aportes_regalo_usd), color: "#9CA3AF" },
        ]} />
      </section>

      <section className="grid grid-cols-2 gap-3 text-sm">
        <Link href="/mi/inversiones" className="rounded-2xl bg-white shadow-sm p-4 font-semibold">En qué estás invertida →</Link>
        <Link href="/mi/futuro" className="rounded-2xl bg-white shadow-sm p-4 font-semibold">Cuánto podrías tener →</Link>
      </section>

      <BotonCompartir url={`/reporte/${id}`} nombre={`Mi cartera ${r.nombre}`}
        className="w-full rounded-2xl text-white font-bold py-3 shadow-sm" style={{ background: "var(--color-h)" }} />

      <p className="text-xs text-tenue text-center">
        Todo se mide en <Explicame termino="MEP">dólares MEP</Explicame>.
      </p>
      {!esAdmin && (
        <form action={salir} className="text-center"><button className="text-sm text-tenue underline">Salir</button></form>
      )}
    </div>
  );
}
