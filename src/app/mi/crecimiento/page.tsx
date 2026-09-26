import { Evolucion } from "@/components/graficos";
import { Explicame } from "@/components/explicame";
import { Monto, Pct } from "@/components/preferencias";
import { indices, mepActual, movimientos, resumenes, seguimiento, tickers } from "@/lib/datos";
import { compararAlternativas } from "@/lib/comparacion";
import { serieEvolucion } from "@/lib/evolucion";
import { fmtFecha, fmtMes } from "@/lib/formato";
import { hitos } from "@/lib/hitos";
import { hermanaDeLaVista } from "@/lib/vista";

export const metadata = { title: "Cómo viene creciendo" };

export default async function Crecimiento() {
  const { id } = await hermanaDeLaVista();
  const [rs, seg, movs, tks, idx, mep] = await Promise.all([
    resumenes(), seguimiento(id), movimientos({ hermana: id }, 2000), tickers(), indices(), mepActual(),
  ]);
  const r = rs.find((x) => x.hermana_id === id);
  const color = r?.color ?? "#0B2545";
  const total = Number(r?.total_usd ?? 0);
  const lineaDeTiempo = hitos(movs, seg, new Map(tks.map((t) => [t.ticker!, t.categoria ?? ""])));

  const flujos = movs.filter((m) => m.tipo === "Aporte" || m.tipo === "Retiro").map((m) => {
    const s = m.tipo === "Retiro" ? -1 : 1;
    return { fecha: m.fecha!, usd: s * Number(m.monto_usd), ars: s * Number(m.monto_ars) };
  });
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
  const alternativas = [
    { nombre: "Tu cartera", usd: total, detalle: "Lo que armamos para vos.", tuya: true },
    ...compararAlternativas(flujos, idx, mep.valor, hoy).map((a) => ({ ...a, tuya: false })),
  ].sort((a, b) => b.usd - a.usd);
  const maximo = Math.max(...alternativas.map((a) => a.usd), 1);
  const aportado = Number(r?.aportado_neto_usd ?? 0);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white shadow-sm p-5">
        <h1 className="font-bold text-lg mb-3">Cómo viene creciendo</h1>
        <Evolucion puntos={serieEvolucion(seg)} color={color} alto={220} />
        <p className="text-xs text-tenue mt-2">Cada punto es el <Explicame termino="cierre">cierre del mes</Explicame>.</p>
      </section>

      <section className="rounded-2xl bg-white shadow-sm p-5">
        <h2 className="font-bold mb-1">¿Valió la pena?</h2>
        <p className="text-sm text-tenue mb-4">
          Qué tendrías hoy si cada peso que se puso, el mismo día, hubiera ido a otro lado.
        </p>
        <ul className="space-y-3">
          {alternativas.map((a) => (
            <li key={a.nombre}>
              <div className="flex justify-between text-sm gap-2">
                <span className={a.tuya ? "font-bold" : ""}>{a.nombre}</span>
                <span className="shrink-0"><Monto usd={a.usd} className={a.tuya ? "font-bold" : ""} />{" "}
                  <Pct valor={aportado > 0 ? a.usd / aportado - 1 : null} signo className="text-xs" /></span>
              </div>
              <div className="h-2.5 mt-1 rounded-full bg-fondo overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(Math.max(a.usd, 0) / maximo) * 100}%`, background: a.tuya ? color : "#9CA3AF" }} />
              </div>
              <p className="text-xs text-tenue mt-0.5">{a.detalle}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-tenue mt-3">Con pocos meses la comparación dice poco: esto se mira a varios años.</p>
      </section>

      {lineaDeTiempo.length > 0 && (
        <section className="rounded-2xl bg-white shadow-sm p-5">
          <h2 className="font-bold mb-3">Tu recorrido</h2>
          <ol className="relative border-l-2 ml-3 space-y-4" style={{ borderColor: color }}>
            {lineaDeTiempo.map((h) => (
              <li key={h.titulo + h.fecha} className="ml-5">
                <span className="absolute -left-3.5 grid place-items-center size-7 rounded-full bg-white border-2 text-sm" style={{ borderColor: color }}>{h.icono}</span>
                <p className="text-xs text-tenue">{h.fecha.endsWith("-01") && h.titulo.includes("mes") ? fmtMes(h.fecha) : fmtFecha(h.fecha)}</p>
                <p className="font-semibold">{h.titulo}</p>
                <p className="text-sm text-tenue">{h.texto}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="rounded-2xl bg-white shadow-sm p-5">
        <h2 className="font-bold mb-2">Mes a mes</h2>
        <ul className="divide-y divide-borde/70 text-sm">
          {[...seg].reverse().map((m) => (
            <li key={m.mes} className="py-2 flex justify-between gap-2">
              <span>{fmtMes(m.mes!)}{m.es_mes_actual ? " (en curso)" : ""}</span>
              <span className="text-right">
                <Monto usd={m.cierre_usd == null ? null : Number(m.cierre_usd)} />{" "}
                <Pct valor={m.rendimiento_mes == null ? null : Number(m.rendimiento_mes)} signo className="text-xs" />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
