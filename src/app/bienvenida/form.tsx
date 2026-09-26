"use client";

import { useActionState } from "react";
import { configurarInicio, type EstadoBienvenida } from "./actions";

const campo = "w-full rounded-md border border-borde bg-completar px-3 py-2";

export function FormBienvenida({ hermanas }: { hermanas: { id: number; nombre: string; color: string }[] }) {
  const [estado, accion, enviando] = useActionState<EstadoBienvenida, FormData>(configurarInicio, {});
  return (
    <form action={accion} className="space-y-5">
      <fieldset className="rounded-xl bg-white border border-borde p-5 space-y-3">
        <legend className="font-bold text-marino px-1">1. Tu entrada (Joaquín)</legend>
        <label className="block text-sm">Tu email
          <input name="email" type="email" required autoComplete="email" className={campo} />
        </label>
        <label className="block text-sm">Inventá una clave (mínimo 10 caracteres)
          <input name="clave" type="password" required minLength={10} autoComplete="new-password" className={campo} />
        </label>
        <label className="block text-sm">Repetí la clave
          <input name="clave2" type="password" required minLength={10} autoComplete="new-password" className={campo} />
        </label>
      </fieldset>

      <fieldset className="rounded-xl bg-white border border-borde p-5 space-y-4">
        <legend className="font-bold text-marino px-1">2. El PIN de cada una (6 números)</legend>
        {hermanas.map((h) => (
          <div key={h.id} className="grid grid-cols-2 gap-3 items-end">
            <label className="text-sm"><span className="font-bold" style={{ color: h.color }}>{h.nombre}</span> · PIN
              <input name={`pin_${h.id}`} type="password" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="off" className={campo} />
            </label>
            <label className="text-sm">Repetir PIN
              <input name={`pin2_${h.id}`} type="password" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="off" className={campo} />
            </label>
          </div>
        ))}
        <p className="text-xs text-tenue">Anotalos: después se los pasás a cada una. Se pueden cambiar desde Configuración, pero nunca se pueden ver.</p>
      </fieldset>

      {estado.error && <p className="text-baja font-semibold" role="alert">{estado.error}</p>}
      <button disabled={enviando} className="w-full rounded-lg bg-marino text-white font-bold py-3 disabled:opacity-60">
        {enviando ? "Creando…" : "Crear y entrar"}
      </button>
    </form>
  );
}
