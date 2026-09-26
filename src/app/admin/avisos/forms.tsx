"use client";

import { useActionState, useTransition } from "react";
import { agregarEvento, borrarEvento, guardarPlan, guardarReglas, type Estado } from "./actions";

const campo = "rounded-md border border-borde bg-completar px-2 py-1.5 text-sm";

const TEXTO: Record<string, { titulo: string; unidad: string; pct: boolean }> = {
  desvio_categoria: { titulo: "Una categoría se aleja de su objetivo más de", unidad: "%", pct: true },
  movimiento_posicion: { titulo: "Una posición se mueve en el mes más de", unidad: "%", pct: true },
  aporte_sin_registrar: { titulo: "Efectivo en IOL que el libro no explica, más de", unidad: "$", pct: false },
  vencimiento_on: { titulo: "Avisar antes de un cupón o vencimiento de ON", unidad: "días", pct: false },
};

function Mensaje({ e }: { e: Estado }) {
  if (e.error) return <span className="text-baja text-sm">{e.error}</span>;
  if (e.ok) return <span className="text-sube text-sm">{e.ok}</span>;
  return null;
}

export function FormReglas({ reglas }: { reglas: { tipo: string; umbral: number | null; activa: boolean; nota: string | null }[] }) {
  const [estado, accion, guardando] = useActionState<Estado, FormData>(guardarReglas, {});
  const orden = Object.keys(TEXTO);
  return (
    <form action={accion} className="space-y-3 text-sm">
      {[...reglas].sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo)).map((r) => {
        const t = TEXTO[r.tipo];
        if (!t) return null;
        const valor = r.umbral == null ? "" : t.pct ? +(r.umbral * 100).toFixed(2) : r.umbral;
        return (
          <label key={r.tipo} className="flex items-center gap-2 flex-wrap">
            <input type="checkbox" name={`activa_${r.tipo}`} defaultChecked={r.activa} className="size-4" />
            <span className="flex-1 min-w-48">{t.titulo}</span>
            {t.unidad === "$" && <span>$</span>}
            <input name={`umbral_${r.tipo}`} inputMode="decimal" defaultValue={valor} className={`${campo} w-20 text-right`} />
            {t.unidad !== "$" && <span className="w-8">{t.unidad}</span>}
          </label>
        );
      })}
      <div className="flex items-center gap-3">
        <button disabled={guardando} className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold disabled:opacity-60">Guardar</button>
        <Mensaje e={estado} />
      </div>
    </form>
  );
}

export function FormEvento() {
  const [estado, accion, guardando] = useActionState<Estado, FormData>(agregarEvento, {});
  return (
    <form action={accion} key={estado.ok} className="flex flex-wrap items-end gap-2 text-sm">
      <label className="flex flex-col gap-1">Fecha<input type="date" name="fecha" required className={campo} /></label>
      <label className="flex flex-col gap-1">Ticker<input name="ticker" className={`${campo} w-24 uppercase`} /></label>
      <label className="flex flex-col gap-1 flex-1 min-w-40">Qué pasa<input name="descripcion" required placeholder="Paga cupón / vence" className={`${campo} w-full`} /></label>
      <button disabled={guardando} className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold disabled:opacity-60">Agregar</button>
      <Mensaje e={estado} />
    </form>
  );
}

export function BotonBorrarEvento({ id }: { id: number }) {
  const [pendiente, start] = useTransition();
  return (
    <button disabled={pendiente} onClick={() => start(async () => { await borrarEvento(id); })} className="text-baja hover:underline shrink-0">
      Borrar
    </button>
  );
}

type Plan = { monto: number; moneda: string; dia_mes: number; aportante: string; activo: boolean; desde: string } | null;

export function FormPlan({ hermanaId, plan }: { hermanaId: number; plan: Plan }) {
  const [estado, accion, guardando] = useActionState<Estado, FormData>(guardarPlan, {});
  return (
    <form action={accion} className="flex flex-wrap items-end gap-2 text-sm">
      <input type="hidden" name="hermana_id" value={hermanaId} />
      <label className="flex flex-col gap-1">Monto por mes
        <input name="monto" inputMode="decimal" defaultValue={plan?.monto ?? ""} placeholder="Vacío = sin plan" className={`${campo} w-32`} />
      </label>
      <label className="flex flex-col gap-1">Moneda
        <select name="moneda" defaultValue={plan?.moneda ?? "ARS"} className={campo}><option>ARS</option><option>USD</option></select>
      </label>
      <label className="flex flex-col gap-1">Día del mes
        <input name="dia_mes" type="number" min={1} max={28} defaultValue={plan?.dia_mes ?? 5} className={`${campo} w-20`} />
      </label>
      <label className="flex flex-col gap-1">Quién aporta
        <select name="aportante" defaultValue={plan?.aportante ?? "Joaquín"} className={campo}>
          <option value="Joaquín">Joaquín</option><option value="Propio">Ella</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">Desde
        <input type="date" name="desde" defaultValue={plan?.desde ?? ""} className={campo} />
      </label>
      <label className="flex items-center gap-1.5 pb-2"><input type="checkbox" name="activo" defaultChecked={plan?.activo ?? true} className="size-4" />Activo</label>
      <button disabled={guardando} className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold disabled:opacity-60">Guardar</button>
      <Mensaje e={estado} />
    </form>
  );
}
