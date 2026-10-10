"use client";

import { useActionState, useState } from "react";
import { cambiarClave, type Estado } from "./actions";

const campo = "rounded-md border border-borde bg-completar px-2 py-1.5 text-sm";

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
