"use client";

import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Explicame } from "@/components/explicame";
import { Monto, usePreferencias } from "@/components/preferencias";
import { fmtDinero } from "@/lib/formato";
import { aporteNecesario, proyectar, tasaMensual, type Gasto, type Tramo } from "@/lib/proyeccion";

type Props = {
  color: string; nacimiento: string; edad: number; anio: number; mes: number;
  valorActual: number; aportadoHoy: number;
  supuestos: { rendimiento: number; pesimista: number; optimista: number; edadHasta: number; meta: number; metaEdad: number };
  tramos: Tramo[]; gastos: Gasto[];
};

/**
 * Mi futuro: la proyección de interés compuesto del Excel, con deslizadores para jugar
 * ("¿y si pongo más?", "¿y si rinde menos?", "¿y si saco plata para un viaje?").
 */
export function Simulador(p: Props) {
  const nacio = Number(p.nacimiento.slice(0, 4));
  const propio = p.tramos.find((t) => t.quien === "Propio");
  const [aporte, setAporte] = useState(propio?.monto_usd_mes ?? 50);
  const [desdeEdad, setDesdeEdad] = useState(Math.max(p.edad, propio ? propio.desde_anio - nacio : 19));
  const [rend, setRend] = useState(Math.round(p.supuestos.rendimiento * 100));
  const [conGasto, setConGasto] = useState(false);
  const [gastoEdad, setGastoEdad] = useState(Math.max(p.edad + 1, 22));
  const [gastoMonto, setGastoMonto] = useState(2000);
  const { moneda, oculto, mep } = usePreferencias();

  const filas = useMemo(() => {
    const tramos: Tramo[] = [
      ...p.tramos.filter((t) => t.quien !== "Propio"),
      ...(aporte > 0 ? [{ desde_anio: nacio + desdeEdad, hasta_anio: nacio + p.supuestos.edadHasta, monto_usd_mes: aporte, quien: "Propio" }] : []),
    ];
    const gastos = [...p.gastos, ...(conGasto ? [{ anio: nacio + gastoEdad, concepto: "¿y si...?", monto_usd: gastoMonto }] : [])];
    const r = rend / 100;
    return proyectar({
      edad: p.edad, anio: p.anio, mes: p.mes, valorActual: p.valorActual, aportadoHoy: p.aportadoHoy,
      rendimiento: r, pesimista: Math.max(0, r - 0.05), optimista: r + 0.05, edadHasta: p.supuestos.edadHasta, tramos, gastos,
    });
  }, [p, nacio, aporte, desdeEdad, rend, conGasto, gastoEdad, gastoMonto]);

  const final = filas[filas.length - 1];
  const hitos = [18, 25, 30, 40].filter((e) => e > p.edad && e <= p.supuestos.edadHasta);
  const en = (e: number) => filas.find((f) => f.edad === e);
  const metaMeses = (p.supuestos.metaEdad - p.edad) * 12;
  const necesario = aporteNecesario(tasaMensual(rend / 100), metaMeses, p.valorActual, p.supuestos.meta);
  const f = (usd: number) => (oculto ? "••••" : fmtDinero(moneda === "USD" ? usd : usd * mep, moneda));
  const datos = filas.map((x) => ({ edad: x.edad, con: x.conAporte, sin: x.sinAporte, rango: [x.pesimista, x.optimista], aportado: x.aportado }));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white shadow-sm p-5 text-center">
        <p className="text-tenue">A los {final.edad} años podrías tener</p>
        <p className="text-4xl font-black mt-1" style={{ color: p.color }}><Monto usd={final.conAporte} /></p>
        <p className="text-sm text-tenue mt-2">
          Sin tu aporte serían <Monto usd={final.sinAporte} />. De todo eso, se puso <Monto usd={final.aportado} />:{" "}
          el resto lo hace el <Explicame termino="interes_compuesto">interés compuesto</Explicame>.
        </p>
        {moneda === "ARS" && <p className="text-xs text-tenue mt-1">En pesos de hoy (al MEP actual).</p>}
      </section>

      <section className="rounded-2xl bg-white shadow-sm p-5">
        <div className="flex gap-4 text-xs text-tenue mb-2 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5" style={{ background: p.color }} />Con tu aporte</span>
          <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-tenue" />Sin tu aporte</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm opacity-30" style={{ background: p.color }} />Si rinde 5% más o menos</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer>
            <ComposedChart data={datos} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="edad" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(e) => `${e}`} />
              <YAxis width={oculto ? 8 : 58} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => (oculto ? "" : moneda === "USD" ? `${Math.round(v / 1000)}k` : `${Math.round((v * mep) / 1e6)}M`)} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof datos)[number];
                return (
                  <div className="rounded-md bg-white border border-borde shadow px-3 py-2 text-sm num">
                    <p className="font-semibold">A los {label} años</p>
                    <p>Con tu aporte: {f(d.con)}</p>
                    <p className="text-tenue">Sin tu aporte: {f(d.sin)}</p>
                    <p className="text-tenue">Puesto: {f(d.aportado)}</p>
                  </div>
                );
              }} />
              <Area dataKey="rango" stroke="none" fill={p.color} fillOpacity={0.15} isAnimationActive={false} />
              <Line dataKey="sin" stroke="#6b7280" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="con" stroke={p.color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow-sm p-5 space-y-5">
        <h2 className="font-bold">Jugá con los números</h2>
        <Deslizador etiqueta="Cuando trabajes, ¿cuánto pondrías por mes?" valor={aporte} min={0} max={500} paso={10}
          mostrar={f(aporte)} onChange={setAporte} color={p.color} />
        <Deslizador etiqueta="¿Desde qué edad?" valor={desdeEdad} min={p.edad} max={35} paso={1}
          mostrar={`${desdeEdad} años`} onChange={setDesdeEdad} color={p.color} />
        <Deslizador etiqueta="¿Cuánto rinde por año?" valor={rend} min={2} max={15} paso={1}
          mostrar={`${rend}%`} onChange={setRend} color={p.color}
          ayuda={<Explicame termino="riesgo">¿Cuánto es razonable?</Explicame>} />
        <div>
          <label className="flex items-center gap-2 font-semibold text-sm">
            <input type="checkbox" checked={conGasto} onChange={(e) => setConGasto(e.target.checked)} className="size-4" style={{ accentColor: p.color }} />
            ¿Y si sacás plata para algo? (un viaje, estudiar, un auto)
          </label>
          {conGasto && (
            <div className="mt-3 space-y-4 pl-6">
              <Deslizador etiqueta="¿A qué edad?" valor={gastoEdad} min={p.edad + 1} max={p.supuestos.edadHasta} paso={1}
                mostrar={`${gastoEdad} años`} onChange={setGastoEdad} color={p.color} />
              <Deslizador etiqueta="¿Cuánto?" valor={gastoMonto} min={500} max={20000} paso={500}
                mostrar={f(gastoMonto)} onChange={setGastoMonto} color={p.color} />
            </div>
          )}
        </div>
      </section>

      {hitos.length > 0 && (
        <section className="rounded-2xl bg-white shadow-sm p-5">
          <h2 className="font-bold mb-2">Cuánto tendrías a cada edad</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-tenue text-xs"><th className="text-left py-1">Edad</th><th className="text-right">Con tu aporte</th><th className="text-right">Sin tu aporte</th></tr></thead>
            <tbody>
              {hitos.map((e) => (
                <tr key={e} className="border-t border-borde/70">
                  <td className="py-1.5 font-semibold">{e} años</td>
                  <td className="text-right"><Monto usd={en(e)?.conAporte} /></td>
                  <td className="text-right text-tenue"><Monto usd={en(e)?.sinAporte} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {necesario != null && metaMeses > 0 && (
        <section className="rounded-2xl bg-white shadow-sm p-5">
          <h2 className="font-bold mb-1">Una meta</h2>
          <p className="text-sm">
            Para tener <b><Monto usd={p.supuestos.meta} /></b> a los {p.supuestos.metaEdad} años, desde hoy harían falta{" "}
            <b><Monto usd={necesario} /></b> por mes (rindiendo {rend}% por año).
          </p>
        </section>
      )}
      <p className="text-xs text-tenue text-center px-4">
        Es una estimación: nadie sabe cuánto van a rendir las inversiones. Sirve para ver el efecto de empezar temprano.
      </p>
    </div>
  );
}

function Deslizador({ etiqueta, valor, min, max, paso, mostrar, onChange, color, ayuda }: {
  etiqueta: string; valor: number; min: number; max: number; paso: number; mostrar: string;
  onChange: (v: number) => void; color: string; ayuda?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex justify-between items-baseline gap-2 text-sm">
        <span>{etiqueta}</span><b className="num shrink-0">{mostrar}</b>
      </span>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 h-2" style={{ accentColor: color }} />
      {ayuda && <span className="text-xs text-tenue">{ayuda}</span>}
    </label>
  );
}
