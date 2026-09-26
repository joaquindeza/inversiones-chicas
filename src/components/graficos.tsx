"use client";

import {
  CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtDinero, fmtMes, fmtPct } from "@/lib/formato";
import { Monto, Pct, usePreferencias } from "./preferencias";

// Gráficos con la guía de dataviz: trazos finos, leyenda siempre (la identidad nunca va solo por
// color), tooltip al pasar el mouse, un solo eje. Los montos respetan el ojo y USD/ARS.

export type Porcion = { nombre: string; color: string; usd: number; pct: number | null };

/** Dona + tabla-leyenda con nombre, % y monto. Las porciones van en el orden recibido (fijo). */
export function Dona({ porciones, alto = 200 }: { porciones: Porcion[]; alto?: number }) {
  const datos = porciones.filter((p) => p.usd > 0.0001).map((p) => ({ ...p, fill: p.color }));
  if (!datos.length) return <p className="text-sm text-tenue py-6 text-center">Sin datos todavía.</p>;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div style={{ width: alto, height: alto }} className="shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={datos} dataKey="usd" nameKey="nombre" innerRadius="58%" outerRadius="100%"
              paddingAngle={datos.length > 1 ? 1.5 : 0} stroke="#fff" strokeWidth={2} isAnimationActive={false}
            />
            <Tooltip content={<TooltipPorcion />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <table className="text-sm w-full">
        <tbody>
          {datos.map((p) => (
            <tr key={p.nombre}>
              <td className="py-1 pr-2"><span className="inline-block size-3 rounded-sm align-middle mr-2" style={{ background: p.color }} />{p.nombre}</td>
              <td className="py-1 px-2 text-right"><Pct valor={p.pct} /></td>
              <td className="py-1 pl-2 text-right text-tenue"><Monto usd={p.usd} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TooltipPorcion({ active, payload }: { active?: boolean; payload?: { payload: Porcion }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md bg-white border border-borde shadow px-3 py-2 text-sm">
      <p className="font-semibold">{p.nombre}</p>
      <p><Pct valor={p.pct} /> · <Monto usd={p.usd} /></p>
    </div>
  );
}

export type PuntoEvolucion = { mes: string; aportadoUsd: number; patrimonioUsd: number | null; aportadoArs: number; patrimonioArs: number | null };

/** Lo aportado vs. lo que vale, mes a mes. La distancia entre las líneas es la ganancia. */
export function Evolucion({ puntos, color = "#0B2545", alto = 240 }: { puntos: PuntoEvolucion[]; color?: string; alto?: number }) {
  const { moneda, oculto } = usePreferencias();
  const datos = puntos.map((p) => ({
    mes: p.mes,
    aportado: moneda === "USD" ? p.aportadoUsd : p.aportadoArs,
    patrimonio: moneda === "USD" ? p.patrimonioUsd : p.patrimonioArs,
  }));
  if (!datos.length) return <p className="text-sm text-tenue py-6 text-center">Sin datos todavía.</p>;
  const fmtEje = (v: number) => (oculto ? "" : moneda === "USD" ? `US$ ${Math.round(v)}` : `$ ${Math.round(v / 1000)}k`);
  return (
    <div>
      <div className="flex gap-4 text-xs text-tenue mb-2">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5" style={{ background: color }} />Lo que vale</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-tenue" />Lo aportado</span>
      </div>
      <div style={{ height: alto }}>
        <ResponsiveContainer>
          <LineChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtEje} width={oculto ? 8 : 70} tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipEvolucion />} />
            <Line dataKey="aportado" stroke="#6b7280" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="patrimonio" stroke={color} strokeWidth={2} dot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TooltipEvolucion({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  const { moneda, oculto } = usePreferencias();
  if (!active || !payload?.length || !label) return null;
  const v = (k: string) => payload.find((p) => p.dataKey === k)?.value;
  const f = (x?: number) => (oculto ? "••••" : fmtDinero(x, moneda));
  const ap = v("aportado"), pa = v("patrimonio");
  return (
    <div className="rounded-md bg-white border border-borde shadow px-3 py-2 text-sm num">
      <p className="font-semibold">{fmtMes(label)}</p>
      <p>Vale: {f(pa)}</p>
      <p className="text-tenue">Aportado: {f(ap)}</p>
      {ap != null && pa != null && ap > 0 && <p>Resultado: {fmtPct(pa / ap - 1, true)}</p>}
    </div>
  );
}

/** "Cuánto es mío": barra apilada de quién puso la plata. */
export function BarraAportes({ partes }: { partes: { nombre: string; usd: number; color: string }[] }) {
  const total = partes.reduce((a, p) => a + p.usd, 0);
  if (total <= 0) return <p className="text-sm text-tenue">Todavía no hay aportes.</p>;
  const visibles = partes.filter((p) => p.usd > 0);
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 bg-white">
        {visibles.map((p) => (
          <div key={p.nombre} style={{ width: `${(p.usd / total) * 100}%`, background: p.color }} title={p.nombre} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm">
        {partes.map((p) => (
          <li key={p.nombre} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
            {p.nombre}: <Pct valor={p.usd / total} className="font-semibold" /> <span className="text-tenue">(<Monto usd={p.usd} />)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
