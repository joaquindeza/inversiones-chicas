"use client";

import { useActionState, useMemo, useState } from "react";
import { Monto } from "@/components/preferencias";
import { Logo } from "@/components/logo";
import { Seccion, td, th } from "@/components/ui";
import type { TickerV } from "@/lib/datos";
import { fmtFechaHora } from "@/lib/formato";
import { guardarTicker, type EstadoTicker } from "./actions";

type Cat = { id: number; nombre: string; color: string };

export function CatalogoTickers({ tickers, categorias, plataformas }: { tickers: TickerV[]; categorias: Cat[]; plataformas: string[] }) {
  const [buscar, setBuscar] = useState("");
  const [soloConPrecio, setSoloConPrecio] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const lista = useMemo(() => tickers.filter((t) =>
    (!soloConPrecio || t.precio != null) &&
    (`${t.ticker} ${t.nombre}`.toLowerCase().includes(buscar.toLowerCase()))), [tickers, buscar, soloConPrecio]);

  return (
    <>
      <FilaTicker key="nuevo" categorias={categorias} plataformas={plataformas} />
      <Seccion titulo={`${lista.length} tickers`} accion={
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={soloConPrecio} onChange={(e) => setSoloConPrecio(e.target.checked)} />Solo con precio</label>
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar…" className="rounded-md border border-borde px-2 py-1" />
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>
              {["Ticker", "Nombre", "Categoría", "Plataforma", "Precio", "Cotiza cada", "USD por unidad", "Actualizado", ""].map((h, i) => (
                <th key={i} className={`${th} ${[4, 5, 6].includes(i) ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {lista.map((t) => editando === t.ticker ? (
                <tr key={t.ticker}><td colSpan={9} className="py-2">
                  <FilaTicker ticker={t} categorias={categorias} plataformas={plataformas} cerrar={() => setEditando(null)} />
                </td></tr>
              ) : (
                <tr key={t.ticker} className="hover:bg-fondo">
                  <td className={`${td} font-bold`}><span className="inline-flex items-center gap-2"><Logo ticker={t.ticker!} color={t.categoria_color} tam={20} />{t.ticker}</span></td>
                  <td className={`${td} max-w-72 truncate`}>{t.nombre}</td>
                  <td className={td}>{t.categoria && <><span className="inline-block size-2.5 rounded-sm mr-1.5" style={{ background: t.categoria_color! }} />{t.categoria}</>}</td>
                  <td className={td}>{t.plataforma}</td>
                  <td className={`${td} text-right num`}>{t.precio == null ? "—" : `${t.moneda === "USD" ? "US$" : "$"} ${Number(t.precio).toLocaleString("es-AR")}`}</td>
                  <td className={`${td} text-right num`}>{Number(t.cotiza_cada)}</td>
                  <td className={`${td} text-right`}>{t.precio_usd == null ? "—" : <Monto usd={Number(t.precio_usd)} />}</td>
                  <td className={`${td} text-tenue`}>{t.actualizado ? `${fmtFechaHora(t.actualizado)} · ${t.fuente ?? ""}` : ""}</td>
                  <td className={`${td} text-right`}><button onClick={() => setEditando(t.ticker!)} className="text-marino hover:underline">Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>
    </>
  );
}

function FilaTicker({ ticker, categorias, plataformas, cerrar }: {
  ticker?: TickerV; categorias: Cat[]; plataformas: string[]; cerrar?: () => void;
}) {
  const [estado, accion, guardando] = useActionState<EstadoTicker, FormData>(async (p, f) => {
    const r = await guardarTicker(p, f);
    if (r.ok && cerrar) cerrar();
    return r;
  }, {});
  const [abierto, setAbierto] = useState(!!ticker);
  const campo = "rounded-md border border-borde bg-completar px-2 py-1.5 text-sm w-full";

  if (!abierto) {
    return (
      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => setAbierto(true)} className="rounded-md bg-marino text-white px-4 py-2 font-semibold text-sm">+ Agregar ticker</button>
        {estado.ok && <p className="text-sm text-tenue">{estado.ok}</p>}
      </div>
    );
  }
  return (
    <form action={accion} className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 items-end text-sm ${ticker ? "" : "mb-4 rounded-xl bg-white border border-borde p-4"}`}>
      <input type="hidden" name="original" value={ticker?.ticker ?? ""} />
      <input type="hidden" name="precio_original" value={ticker?.precio ?? ""} />
      <label className="flex flex-col gap-1">Ticker<input name="ticker" required defaultValue={ticker?.ticker ?? ""} className={`${campo} uppercase`} /></label>
      <label className="flex flex-col gap-1 lg:col-span-2">Nombre<input name="nombre" defaultValue={ticker?.nombre ?? ""} className={campo} /></label>
      <label className="flex flex-col gap-1">Categoría
        <select name="categoria_id" defaultValue={ticker?.categoria_id ?? ""} className={campo}>
          <option value="">—</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">Plataforma
        <select name="plataforma" defaultValue={ticker?.plataforma ?? "IOL"} className={campo}>
          <option value="">—</option>
          {plataformas.map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">Moneda
        <select name="moneda" defaultValue={ticker?.moneda ?? "ARS"} className={campo}><option>ARS</option><option>USD</option></select>
      </label>
      <label className="flex flex-col gap-1">Precio<input name="precio" inputMode="decimal" defaultValue={ticker?.precio ?? ""} className={campo} /></label>
      <label className="flex flex-col gap-1">Cotiza cada<input name="cotiza_cada" inputMode="decimal" defaultValue={ticker?.cotiza_cada ?? 1} className={campo} /></label>
      <div className="col-span-2 md:col-span-4 lg:col-span-8 flex items-center gap-3">
        <button disabled={guardando} className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold disabled:opacity-60">{guardando ? "Guardando…" : "Guardar"}</button>
        <button type="button" onClick={() => (cerrar ? cerrar() : setAbierto(false))} className="text-tenue hover:text-tinta">Cancelar</button>
        {estado.error && <p className="text-baja" role="alert">{estado.error}</p>}
      </div>
    </form>
  );
}
