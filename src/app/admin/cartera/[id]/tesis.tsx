"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { guardarTesis, type EstadoTesis } from "./actions";

type Tesis = { por_que: string | null; horizonte: string | null; cuando_vender: string | null } | null;

/** Botón + ventana para escribir por qué compramos una posición (la memoria de las decisiones). */
export function BotonTesis({ hermanaId, ticker, tesis }: { hermanaId: number; ticker: string; tesis: Tesis }) {
  const [abierto, setAbierto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const [estado, accion, guardando] = useActionState<EstadoTesis, FormData>(async (p, f) => {
    const r = await guardarTesis(p, f);
    if (r.ok) setAbierto(false);
    return r;
  }, {});

  useEffect(() => {
    const d = dialogo.current;
    if (abierto && d && !d.open) d.showModal();
    if (!abierto && d?.open) d.close();
  }, [abierto]);

  const campo = "w-full rounded-md border border-borde bg-completar px-2 py-1.5 text-sm";
  return (
    <>
      <button onClick={() => setAbierto(true)} className={tesis?.por_que ? "text-marino hover:underline" : "text-aviso hover:underline"}>
        {tesis?.por_que ? "Ver/editar" : "Escribir"}
      </button>
      <dialog ref={dialogo} onClose={() => setAbierto(false)} className="m-auto w-full max-w-lg rounded-xl p-0 backdrop:bg-black/40">
        <form action={accion} className="p-5 space-y-3 text-sm">
          <p className="font-black text-marino text-lg">Tesis de {ticker}</p>
          <p className="text-tenue">La ve ella al tocar esta posición en su celular. Escribilo simple.</p>
          <input type="hidden" name="hermana_id" value={hermanaId} />
          <input type="hidden" name="ticker" value={ticker} />
          <label className="block">¿Por qué la compramos?
            <textarea name="por_que" rows={3} defaultValue={tesis?.por_que ?? ""} className={campo} />
          </label>
          <label className="block">¿Con qué horizonte?
            <input name="horizonte" defaultValue={tesis?.horizonte ?? ""} placeholder="Ej: 5 años o más" className={campo} />
          </label>
          <label className="block">¿Qué tendría que pasar para venderla?
            <textarea name="cuando_vender" rows={2} defaultValue={tesis?.cuando_vender ?? ""} className={campo} />
          </label>
          {estado.error && <p className="text-baja">{estado.error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setAbierto(false)} className="text-tenue">Cancelar</button>
            <button disabled={guardando} className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold disabled:opacity-60">Guardar</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
