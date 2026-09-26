"use client";

import {
  CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useEffect, useRef, useState } from "react";
import { fmtDinero, fmtMes, fmtPct } from "@/lib/formato";
import { Logo } from "./logo";
import { Monto, Pct, usePreferencias } from "./preferencias";

// Gráficos con la guía de dataviz: trazos finos, leyenda siempre (la identidad nunca va solo por
// color), tooltip al pasar el mouse, un solo eje. Los montos respetan el ojo y USD/ARS.

export type Sub = { nombre: string; usd: number; etiqueta?: string | null; logo?: boolean };
export type Porcion = { nombre: string; color: string; usd: number; pct: number | null; hijos?: Sub[] };
type Fila = { nombre: string; color: string; usd: number; pct: number | null; etiqueta?: string | null; logo?: boolean; abre?: boolean };

/** Tonos de un color (el más grande, el más oscuro) para las porciones dentro de una categoría. */
function tonos(hex: string, n: number): string[] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Array.from({ length: n }, (_, i) => {
    const t = n <= 1 ? 0 : (i / (n - 1)) * 0.62; // hasta 62% hacia el blanco
    const c = [r, g, b].map((v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, "0"));
    return `#${c.join("")}`;
  });
}

/**
 * Dona + tabla-leyenda con nombre, % y monto. Tocar una categoría (en la torta o en la tabla) abre
 * su propia torta, donde el 100% es esa categoría; la flecha o tocar afuera vuelve a la cartera entera.
 */
export function Dona({ porciones, alto = 200 }: { porciones: Porcion[]; alto?: number }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const tocoPorcion = useRef(false);

  // tocar fuera del gráfico lo vuelve a la cartera entera
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: PointerEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierta(null); };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierta]);

  const visibles = porciones.filter((p) => p.usd > 0.0001);
  const cat = abierta ? visibles.find((p) => p.nombre === abierta) : null;
  let filas: Fila[];
  if (cat) {
    const hijos = [...(cat.hijos ?? [])].filter((h) => h.usd > 0.0001).sort((a, b) => b.usd - a.usd);
    const colores = tonos(cat.color, hijos.length);
    filas = hijos.map((h, i) => ({ ...h, color: colores[i], pct: cat.usd ? h.usd / cat.usd : null }));
  } else {
    filas = visibles.map((p) => ({ ...p, abre: (p.hijos?.filter((h) => h.usd > 0.0001).length ?? 0) > 0 }));
  }
  if (!visibles.length) return <p className="text-sm text-tenue py-6 text-center">Sin datos todavía.</p>;

  const abrir = (f: Fila) => { if (!cat && f.abre) setAbierta(f.nombre); };
  const datos = filas.map((f) => ({ ...f, fill: f.color }));

  return (
    <div ref={caja} className="@container">
      {cat && (
        <button onClick={() => setAbierta(null)} className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-marino hover:underline">
          <span aria-hidden>←</span> Toda la cartera
          <span className="text-tenue font-normal">· {cat.nombre} = 100% (<Pct valor={cat.pct} /> de la cartera)</span>
        </button>
      )}
      {/* lado a lado solo si la caja tiene lugar para las dos cosas; si no, la tabla va abajo */}
      <div className="flex flex-col @[34rem]:flex-row items-center gap-4">
        <div style={{ width: alto, height: alto }} className="shrink-0 [&_*:focus]:outline-none"
          onClick={() => { if (!tocoPorcion.current && cat) setAbierta(null); tocoPorcion.current = false; }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={datos} dataKey="usd" nameKey="nombre" innerRadius="58%" outerRadius="100%"
                paddingAngle={datos.length > 1 ? 1.5 : 0} stroke="#fff" strokeWidth={2} isAnimationActive={false}
                onClick={(_, i) => { tocoPorcion.current = true; abrir(filas[i]); }}
                style={{ cursor: cat ? "default" : "pointer" }}
              />
              <Tooltip content={<TooltipPorcion />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full min-w-0 flex-1 overflow-x-auto">
        <table className="text-sm w-full">
          <tbody>
            {filas.map((f) => (
              <tr key={f.nombre} onClick={() => abrir(f)} className={f.abre ? "cursor-pointer hover:bg-fondo" : ""}>
                <td className="py-1 pr-2">
                  <span className="inline-flex items-center gap-2">
                    {f.logo ? <Logo ticker={f.nombre} color={f.color} tam={20} /> : <span className="inline-block size-3 rounded-sm shrink-0" style={{ background: f.color }} />}
                    <span>{f.nombre}{f.etiqueta && <span className="text-tenue"> {f.etiqueta}</span>}</span>
                    {f.abre && <span className="text-tenue" aria-hidden>›</span>}
                  </span>
                </td>
                <td className="py-1 px-2 text-right whitespace-nowrap"><Pct valor={f.pct} /></td>
                <td className="py-1 pl-2 text-right text-tenue whitespace-nowrap"><Monto usd={f.usd} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {!cat && filas.some((f) => f.abre) && <p className="text-xs text-tenue mt-2">Tocá una categoría para ver qué tiene adentro.</p>}
    </div>
  );
}

function TooltipPorcion({ active, payload }: { active?: boolean; payload?: { payload: Fila }[] }) {
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
      {datos.length === 1 && (
        <p className="text-xs text-tenue mb-1">Por ahora hay un solo mes: la línea aparece cuando se cierre el próximo.</p>
      )}
      <div style={{ height: alto }}>
        <ResponsiveContainer>
          <LineChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtEje} width={oculto ? 8 : 70} tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipEvolucion />} />
            <Line dataKey="aportado" stroke="#6b7280" strokeDasharray="5 4" strokeWidth={2} dot={datos.length === 1 ? { r: 4, fill: "#6b7280", stroke: "#fff", strokeWidth: 2 } : false} isAnimationActive={false} />
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
