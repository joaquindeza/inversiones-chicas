"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ingresar, type EstadoLogin } from "./actions";

export type PerfilLogin = { clave: string; nombre: string; color: string; tipo: "pin" | "clave" };

const LARGO_PIN = 6;

export function SelectorPerfiles({ perfiles }: { perfiles: PerfilLogin[] }) {
  const [elegido, setElegido] = useState<PerfilLogin | null>(null);

  if (!elegido) {
    return (
      <ul className="flex flex-wrap justify-center gap-6 sm:gap-10">
        {perfiles.map((p) => (
          <li key={p.clave}>
            <button
              onClick={() => setElegido(p)}
              className="group flex flex-col items-center gap-3 focus:outline-none"
            >
              <Avatar perfil={p} />
              <span className="text-white/70 group-hover:text-white group-focus-visible:text-white">{p.nombre}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }
  return <Ingreso perfil={elegido} volver={() => setElegido(null)} />;
}

function Avatar({ perfil, grande }: { perfil: PerfilLogin; grande?: boolean }) {
  return (
    <span
      className={`${grande ? "size-24 text-4xl" : "size-24 sm:size-28 text-4xl"} rounded-2xl grid place-items-center font-bold
        ring-offset-4 ring-offset-marino group-hover:ring-4 group-focus-visible:ring-4 ring-white/80 transition`}
      style={{ background: perfil.color }}
    >
      {perfil.nombre[0]}
    </span>
  );
}

function Ingreso({ perfil, volver }: { perfil: PerfilLogin; volver: () => void }) {
  const [pin, setPin] = useState("");
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(async (prev, form) => {
    const r = await ingresar(prev, form);
    if (r.error) setPin(""); // si falló, se vacía para reintentar
    return r;
  }, {});
  const form = useRef<HTMLFormElement>(null);

  // con 6 dígitos se envía solo
  useEffect(() => {
    if (perfil.tipo === "pin" && pin.length === LARGO_PIN) form.current?.requestSubmit();
  }, [pin, perfil.tipo]);
  const tecla = (d: string) => setPin((v) => (v.length < LARGO_PIN ? v + d : v));

  // en la compu también se puede tipear el PIN
  useEffect(() => {
    if (perfil.tipo !== "pin") return;
    const alTeclear = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((v) => (v.length < LARGO_PIN ? v + e.key : v));
      if (e.key === "Backspace") setPin((v) => v.slice(0, -1));
      if (e.key === "Escape") volver();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [perfil.tipo, volver]);

  return (
    <form ref={form} action={accion} className="flex flex-col items-center gap-6 w-full max-w-xs">
      <input type="hidden" name="perfil" value={perfil.clave} />
      <Avatar perfil={perfil} grande />
      <p className="text-lg">Hola, {perfil.nombre}</p>

      {perfil.tipo === "pin" ? (
        <>
          <input type="hidden" name="clave" value={pin} />
          <div className="flex gap-3" aria-label={`PIN: ${pin.length} de ${LARGO_PIN} dígitos`}>
            {Array.from({ length: LARGO_PIN }).map((_, i) => (
              <span key={i} className={`size-3.5 rounded-full border-2 border-white/70 ${i < pin.length ? "bg-white" : ""}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <Tecla key={d} onClick={() => tecla(d)} disabled={enviando}>{d}</Tecla>
            ))}
            <span />
            <Tecla onClick={() => tecla("0")} disabled={enviando}>0</Tecla>
            <Tecla onClick={() => setPin((v) => v.slice(0, -1))} disabled={enviando} aria-label="Borrar">⌫</Tecla>
          </div>
        </>
      ) : (
        <>
          <input
            name="clave" type="password" autoComplete="current-password" autoFocus required
            className="w-full rounded-lg bg-white/10 px-4 py-3 outline-none focus:ring-2 ring-white/60"
            placeholder="Clave"
          />
          <button disabled={enviando} className="w-full rounded-lg bg-white text-marino font-semibold py-3 disabled:opacity-60">
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </>
      )}

      <p role="alert" className="min-h-6 text-sm text-red-200">{estado.error}</p>
      <button type="button" onClick={volver} className="text-white/60 hover:text-white text-sm">← Cambiar de perfil</button>
    </form>
  );
}

function Tecla(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button" {...props}
      className="size-16 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-2xl disabled:opacity-50"
    />
  );
}
