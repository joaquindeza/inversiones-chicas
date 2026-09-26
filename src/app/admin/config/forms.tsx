"use client";

import { useActionState, useState } from "react";
import { cambiarClave, guardarObjetivos, type Estado } from "./actions";

const campo = "rounded-md border border-borde bg-completar px-2 py-1.5 text-sm";

export function FormObjetivos({ categorias }: { categorias: { id: number; nombre: string; color: string; objetivo: number | null }[] }) {
  const [estado, accion, guardando] = useActionState<Estado, FormData>(guardarObjetivos, {});
  return (
    <form action={accion} className="text-sm">
      <table className="w-full">
        <tbody>
          {categorias.map((c) => (
            <tr key={c.id}>
              <td className="py-1"><span className="inline-block size-3 rounded-sm mr-2 align-middle" style={{ background: c.color }} />{c.nombre}</td>
              <td className="py-1 text-right">
                <input name={`obj_${c.id}`} inputMode="decimal" defaultValue={c.objetivo == null ? "" : +(Number(c.objetivo) * 100).toFixed(2)}
                  className={`${campo} w-20 text-right`} /> %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-3">
        <button disabled={guardando} className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold disabled:opacity-60">Guardar</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

export function FormClaves({ perfiles }: { perfiles: { clave: string; nombre: string }[] }) {
  const [estado, accion, guardando] = useActionState<Estado, FormData>(cambiarClave, {});
  const [perfil, setPerfil] = useState(perfiles[0]?.clave ?? "");
  const esAdmin = perfil === "admin";
  return (
    <form action={accion} className="flex flex-wrap items-end gap-3 text-sm" key={estado.ok}>
      <label className="flex flex-col gap-1">Perfil
        <select name="perfil" value={perfil} onChange={(e) => setPerfil(e.target.value)} className={campo}>
          {perfiles.map((p) => <option key={p.clave} value={p.clave}>{p.nombre}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">{esAdmin ? "Clave nueva" : "PIN nuevo"}
        <input name="clave" type="password" required autoComplete="new-password" className={`${campo} w-32`}
          {...(esAdmin ? { minLength: 10 } : { inputMode: "numeric" as const, pattern: "\\d{6}", maxLength: 6 })} />
      </label>
      <label className="flex flex-col gap-1">Repetir
        <input name="repetir" type="password" required autoComplete="new-password" className={`${campo} w-32`}
          {...(esAdmin ? {} : { inputMode: "numeric" as const, maxLength: 6 })} />
      </label>
      <button disabled={guardando} className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold disabled:opacity-60">Cambiar</button>
      <Mensaje estado={estado} />
    </form>
  );
}

function Mensaje({ estado }: { estado: Estado }) {
  if (estado.error) return <p className="text-baja" role="alert">{estado.error}</p>;
  if (estado.ok) return <p className="text-sube" role="status">{estado.ok}</p>;
  return null;
}
