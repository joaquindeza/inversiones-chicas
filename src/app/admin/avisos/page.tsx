import { Seccion, Titulo } from "@/components/ui";
import { cumplimiento, haceDias } from "@/lib/avisos";
import { hermanas, reglas } from "@/lib/datos";
import { fmtFecha, fmtMes } from "@/lib/formato";
import { crearCliente } from "@/lib/supabase/server";
import { FormEvento, FormPlan, FormReglas, BotonBorrarEvento } from "./forms";

const ICONO = { cumplido: "✓", parcial: "◐", falta: "✗", pendiente: "…" } as const;
const CLASE = { cumplido: "bg-green-100 text-sube", parcial: "bg-amber-100 text-aviso", falta: "bg-red-100 text-baja", pendiente: "bg-fondo text-tenue" } as const;

export default async function Avisos() {
  const s = await crearCliente();
  const anio = new Date().getFullYear();
  const [rgl, hs, { data: eventos }, { data: planes }, { data: aportes }] = await Promise.all([
    reglas(), hermanas(),
    s.from("eventos").select("*").gte("fecha", haceDias(30)).order("fecha"),
    s.from("plan_aportes").select("*"),
    s.from("v_movimientos").select("hermana_id, fecha, monto_ars, monto_usd, aportante").eq("tipo", "Aporte").gte("fecha", `${anio}-01-01`),
  ]);

  return (
    <>
      <Titulo sub="Qué avisos querés recibir, los vencimientos de las ONs y el plan de aportes de cada una.">Avisos y recordatorios</Titulo>
      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Reglas de alerta">
          <FormReglas reglas={rgl.map((r) => ({ tipo: r.tipo, umbral: r.umbral == null ? null : Number(r.umbral), activa: r.activa, nota: r.nota }))} />
        </Seccion>

        <Seccion titulo="Cupones y vencimientos de ONs">
          <p className="text-sm text-tenue mb-3">Cargalos a mano (los ves en el prospecto o en IOL). Avisa unos días antes según la regla.</p>
          <FormEvento />
          <ul className="mt-3 text-sm divide-y divide-borde/60">
            {(eventos ?? []).map((e) => (
              <li key={e.id} className="py-1.5 flex justify-between gap-2">
                <span><b className="num">{fmtFecha(e.fecha)}</b> {e.ticker && <b>{e.ticker}</b>} {e.descripcion}</span>
                <BotonBorrarEvento id={e.id} />
              </li>
            ))}
            {!eventos?.length && <li className="py-2 text-tenue">No hay eventos cargados.</li>}
          </ul>
        </Seccion>

        <Seccion titulo={`Plan de aportes y cumplimiento ${anio}`} className="lg:col-span-2"
          accion={<a href="/admin/avisos/calendario.ics" className="text-sm text-marino underline">Agregar a mi calendario (.ics)</a>}>
          <div className="space-y-5">
            {hs.map((h) => {
              const p = (planes ?? []).find((x) => x.hermana_id === h.id);
              const meses = p ? cumplimiento(
                { monto: Number(p.monto), moneda: p.moneda, dia_mes: p.dia_mes, aportante: p.aportante, desde: p.desde },
                (aportes ?? []).filter((a) => a.hermana_id === h.id).map((a) => ({ fecha: a.fecha!, monto_ars: Number(a.monto_ars), monto_usd: Number(a.monto_usd), aportante: a.aportante })),
              ) : [];
              const cumplidos = meses.filter((m) => m.estado === "cumplido").length;
              const exigibles = meses.filter((m) => m.estado !== "pendiente").length;
              return (
                <div key={h.id} className="border-t border-borde pt-4 first:border-0 first:pt-0">
                  <p className="font-bold mb-2" style={{ color: h.color }}>{h.nombre}</p>
                  <FormPlan hermanaId={h.id} plan={p ? { monto: Number(p.monto), moneda: p.moneda, dia_mes: p.dia_mes, aportante: p.aportante, activo: p.activo, desde: p.desde } : null} />
                  {p && meses.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                      {meses.map((m) => (
                        <span key={m.mes} className={`rounded px-2 py-1 ${CLASE[m.estado]}`} title={m.estado}>
                          {fmtMes(m.mes)} {ICONO[m.estado]}
                        </span>
                      ))}
                      <span className="ml-2 text-sm">Cumplido: <b>{cumplidos} de {exigibles}</b> meses</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Seccion>
      </div>
    </>
  );
}
