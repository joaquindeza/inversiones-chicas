"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Monto } from "@/components/preferencias";
import { Seccion, Vacio, td, th } from "@/components/ui";
import type { MovimientoV, TipoMovimiento } from "@/lib/datos";
import { fmtCant, fmtFecha, fmtTC } from "@/lib/formato";
import { borrarMovimiento, guardarMovimiento, type EstadoForm } from "./actions";

type HermanaMin = { id: number; nombre: string; color: string };
type TickerMin = { ticker: string; nombre: string };

const TIPOS: TipoMovimiento[] = ["Aporte", "Retiro", "Compra", "Venta", "Renta/Dividendo", "Gasto/Comisión", "Ingreso de títulos"];
const CON_TICKER = ["Compra", "Venta", "Ingreso de títulos"];

const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

export type Precarga = { tipo: string; hermana_id: number | null; monto: number | null; moneda: string } | null;

export function TablaMovimientos({ movimientos, hermanas, tickers, plataformas, precarga }: {
  movimientos: MovimientoV[]; hermanas: HermanaMin[]; tickers: TickerMin[]; plataformas: string[]; precarga?: Precarga;
}) {
  // si viene de una alerta ("aporte sin registrar"), el formulario abre ya completo
  const [editando, setEditando] = useState<MovimientoV | "nuevo" | null>(precarga ? "nuevo" : null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [borrando, startBorrar] = useTransition();
  const color = new Map(hermanas.map((h) => [h.id, h]));

  const borrar = (m: MovimientoV) => {
    const h = color.get(m.hermana_id!)?.nombre;
    if (!confirm(`¿Borrar ${m.tipo} ${m.ticker ?? ""} de ${h} del ${fmtFecha(m.fecha)}? No se puede deshacer.`)) return;
    startBorrar(async () => {
      const r = await borrarMovimiento(m.id!);
      setMensaje(r.error ?? r.ok ?? null);
    });
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => { setEditando("nuevo"); setMensaje(null); }} className="rounded-md bg-marino text-white px-4 py-2 font-semibold text-sm">
          + Cargar movimiento
        </button>
        {mensaje && <p className="text-sm text-tenue" role="status">{mensaje}</p>}
      </div>

      {editando && (
        <Formulario
          key={editando === "nuevo" ? "nuevo" : editando.id!}
          mov={editando === "nuevo" ? null : editando}
          precarga={editando === "nuevo" ? precarga ?? null : null}
          hermanas={hermanas} tickers={tickers} plataformas={plataformas}
          cerrar={(msg) => { setEditando(null); if (msg) setMensaje(msg); }}
        />
      )}

      <Seccion titulo={`${movimientos.length} movimientos`}>
        {movimientos.length === 0 ? <Vacio>No hay movimientos con ese filtro.</Vacio> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Fecha", "Hermana", "Tipo", "Ticker", "Cantidad", "Monto", "TC", "USD", "Plataforma", "Aportante", "Nota", ""].map((h, i) => (
                    <th key={i} className={`${th} ${[4, 5, 6, 7].includes(i) ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => {
                  const h = color.get(m.hermana_id!);
                  return (
                    <tr key={m.id} className="hover:bg-fondo">
                      <td className={`${td} num`}>{fmtFecha(m.fecha)}</td>
                      <td className={td}><span className="font-semibold" style={{ color: h?.color }}>{h?.nombre}</span></td>
                      <td className={td}>{m.tipo}</td>
                      <td className={`${td} font-bold`}>{m.ticker}</td>
                      <td className={`${td} text-right num`}>{m.cantidad != null ? fmtCant(Number(m.cantidad)) : ""}</td>
                      <td className={`${td} text-right num`}>{m.moneda === "USD" ? "US$" : "$"} {Number(m.monto).toLocaleString("es-AR")}</td>
                      <td className={`${td} text-right num text-tenue`} title={m.tc_manual ? "TC manual" : "MEP del día"}>
                        {fmtTC(Number(m.tc_usado))}{m.tc_manual ? "*" : ""}
                      </td>
                      <td className={`${td} text-right`}><Monto usd={Number(m.monto_usd)} ars={Number(m.monto_ars)} /></td>
                      <td className={td}>{m.plataforma}</td>
                      <td className={td}>{m.aportante}</td>
                      <td className={`${td} max-w-64 truncate text-tenue`} title={m.nota ?? ""}>
                        {m.origen === "IOL" && <span className="mr-1 rounded bg-fondo px-1 text-xs">IOL</span>}{m.nota}
                      </td>
                      <td className={`${td} text-right`}>
                        <button onClick={() => { setEditando(m); setMensaje(null); }} className="text-marino hover:underline mr-3">Editar</button>
                        <button onClick={() => borrar(m)} disabled={borrando} className="text-baja hover:underline">Borrar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>
    </>
  );
}

function Formulario({ mov, precarga, hermanas, tickers, plataformas, cerrar }: {
  mov: MovimientoV | null; precarga?: Precarga; hermanas: HermanaMin[]; tickers: TickerMin[]; plataformas: string[]; cerrar: (msg?: string) => void;
}) {
  const [estado, accion, guardando] = useActionState<EstadoForm, FormData>(guardarMovimiento, {});
  const [tipo, setTipo] = useState<string>(mov?.tipo ?? precarga?.tipo ?? "Compra");

  useEffect(() => {
    if (estado.ok) cerrar(estado.ok);
  }, [estado, cerrar]);

  const campo = "rounded-md border border-borde bg-completar px-2 py-1.5 text-sm w-full";
  const conTicker = CON_TICKER.includes(tipo) || tipo === "Renta/Dividendo";

  return (
    <Seccion titulo={mov ? `Editar movimiento #${mov.id}` : precarga ? `Cargar ${precarga.tipo.toLowerCase()} detectado en IOL — completá la fecha real` : "Cargar movimiento"} className="mb-4 border-marino/40"
      accion={<button onClick={() => cerrar()} className="text-sm text-tenue hover:text-tinta">Cancelar</button>}>
      <form action={accion} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
        {mov && <input type="hidden" name="id" value={mov.id!} />}
        <label className="flex flex-col gap-1">Fecha
          <input type="date" name="fecha" required defaultValue={mov?.fecha ?? hoy()} className={campo} />
        </label>
        <label className="flex flex-col gap-1">Hermana
          <select name="hermana_id" required defaultValue={mov?.hermana_id ?? precarga?.hermana_id ?? ""} className={campo}>
            <option value="" disabled>Elegí…</option>
            {hermanas.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">Tipo
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        {conTicker && (
          <label className="flex flex-col gap-1">Ticker
            <input name="ticker" list="lista-tickers" required={tipo !== "Renta/Dividendo"} defaultValue={mov?.ticker ?? ""}
              className={`${campo} uppercase`} autoComplete="off" />
            <datalist id="lista-tickers">
              {tickers.map((t) => <option key={t.ticker} value={t.ticker}>{t.nombre}</option>)}
            </datalist>
          </label>
        )}
        {CON_TICKER.includes(tipo) && (
          <label className="flex flex-col gap-1">Cantidad
            <input name="cantidad" inputMode="decimal" required defaultValue={mov?.cantidad ?? ""} className={campo} />
          </label>
        )}
        <label className="flex flex-col gap-1">Monto total{CON_TICKER.includes(tipo) ? " (con comisiones)" : ""}
          <input name="monto" inputMode="decimal" required defaultValue={mov?.monto ?? precarga?.monto ?? ""} className={campo} placeholder="Ej: 100.000,50" />
        </label>
        <label className="flex flex-col gap-1">Moneda
          <select name="moneda" defaultValue={mov?.moneda ?? precarga?.moneda ?? "ARS"} className={campo}>
            <option>ARS</option><option>USD</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">TC manual <span className="text-xs text-tenue -mt-1">(opcional; si no, MEP del día)</span>
          <input name="tc_manual" inputMode="decimal" defaultValue={mov?.tc_manual ?? ""} className={campo} />
        </label>
        <label className="flex flex-col gap-1">Plataforma
          <select name="plataforma" defaultValue={mov?.plataforma ?? "IOL"} className={campo}>
            {plataformas.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        {tipo === "Aporte" && (
          <label className="flex flex-col gap-1">¿Quién lo puso?
            <select name="aportante" required defaultValue={mov?.aportante ?? "Joaquín"} className={campo}>
              <option>Joaquín</option><option value="Propio">Ella (propio)</option><option>Regalo</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 col-span-2 md:col-span-3">Nota
          <input name="nota" defaultValue={mov?.nota ?? ""} className={campo} />
        </label>
        <div className="col-span-2 md:col-span-4 lg:col-span-6 flex items-center gap-3">
          <button disabled={guardando} className="rounded-md bg-marino text-white px-5 py-2 font-semibold disabled:opacity-60">
            {guardando ? "Guardando…" : mov ? "Guardar cambios" : "Cargar"}
          </button>
          {estado.error && <p className="text-baja" role="alert">{estado.error}</p>}
        </div>
      </form>
    </Seccion>
  );
}
