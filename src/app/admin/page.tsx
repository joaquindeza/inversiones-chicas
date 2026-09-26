import Link from "next/link";
import { Evolucion } from "@/components/graficos";
import { Monto, Pct } from "@/components/preferencias";
import { Seccion, Tarjeta, Titulo } from "@/components/ui";
import { ItemAlerta, PanelSync } from "@/components/sync";
import {
  alertasPendientes, categoriasTodas, frecuenciaSync, reglas, resumenes, seguimiento, sumarResumenes, ultimoSync,
} from "@/lib/datos";
import { serieEvolucion } from "@/lib/evolucion";
import { fmtPct } from "@/lib/formato";

export default async function InicioAdmin() {
  const [rs, cats, seg, sync, alertas, rgl, frecuencia] = await Promise.all([
    resumenes(), categoriasTodas(), seguimiento(), ultimoSync(), alertasPendientes(), reglas(), frecuenciaSync(),
  ]);
  const t = sumarResumenes(rs);
  const umbral = Number(rgl.find((r) => r.tipo === "desvio_categoria" && r.activa)?.umbral ?? 0.05);
  const desvios = cats.filter((c) => c.desvio != null && Math.abs(Number(c.desvio)) > umbral);
  const nombre = new Map(rs.map((r) => [r.hermana_id, r.nombre]));

  return (
    <>
      <Titulo sub="Todo medido en dólares MEP.">Las tres carteras</Titulo>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Tarjeta titulo="Patrimonio total"><Monto usd={t.total} /></Tarjeta>
        <Tarjeta titulo="Aportado" sub={<>Joaquín <Pct valor={t.aportado ? t.joaquin / t.aportado : null} /></>}>
          <Monto usd={t.aportado} ars={t.aportadoArs} />
        </Tarjeta>
        <Tarjeta titulo="Resultado"><Monto usd={t.resultado} signo /></Tarjeta>
        <Tarjeta titulo="Rendimiento" sub="sobre lo aportado"><Pct valor={t.rendimiento} signo /></Tarjeta>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {rs.map((r) => (
          <Link key={r.hermana_id} href={`/admin/cartera/${r.hermana_id}`}
            className="rounded-xl bg-white border border-borde p-4 hover:shadow-md transition border-t-4"
            style={{ borderTopColor: r.color ?? undefined }}>
            <p className="font-bold" style={{ color: r.color ?? undefined }}>{r.nombre}</p>
            <p className="text-2xl font-black mt-1"><Monto usd={Number(r.total_usd)} /></p>
            <p className="text-sm text-tenue mt-1">
              Aportado <Monto usd={Number(r.aportado_neto_usd)} ars={Number(r.aportado_neto_ars)} /> ·{" "}
              <Pct valor={r.rendimiento == null ? null : Number(r.rendimiento)} signo />
            </p>
            <p className="text-xs text-tenue mt-1">{r.n_posiciones} posiciones · efectivo <Monto usd={Number(r.efectivo_usd)} /></p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Seccion titulo="Lo aportado vs. lo que vale" className="lg:col-span-2">
          <Evolucion puntos={serieEvolucion(seg)} />
        </Seccion>

        <div className="flex flex-col gap-4">
          <Seccion titulo="Sincronización con IOL">
            <PanelSync ultimo={sync} frecuencia={frecuencia} />
            <Link href="/admin/config" className="text-xs text-marino hover:underline mt-2 inline-block">Configurar →</Link>
          </Seccion>

          <Seccion titulo="Para revisar">
            {alertas.length === 0 && desvios.length === 0 ? (
              <p className="text-sm text-tenue">Nada pendiente.</p>
            ) : (
              <ul className="text-sm space-y-2">
                {alertas.map((a) => <ItemAlerta key={a.id} a={a} />)}
                {desvios.map((d) => (
                  <li key={`${d.hermana_id}-${d.categoria}`}>
                    ⚖ <b>{nombre.get(d.hermana_id)}</b>: {d.categoria} está en {fmtPct(Number(d.pct))} (objetivo{" "}
                    {fmtPct(Number(d.objetivo_pct))}). Desvío {fmtPct(Number(d.desvio), true)}.
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        </div>
      </div>
    </>
  );
}
