"use client";

import { useEffect, useRef, useState } from "react";
import { GLOSARIO, type Termino } from "@/lib/explicaciones";

/**
 * "Explicame esto": envuelve una métrica; al tocar el signo de pregunta se abre la explicación
 * en lenguaje simple (en el celular, como hoja desde abajo).
 */
export function Explicame({ termino, children, className = "" }: { termino: Termino; children?: React.ReactNode; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const g = GLOSARIO[termino];

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAbierto(true); }}
        className={`inline-flex items-center gap-1 text-left underline decoration-dotted decoration-1 underline-offset-2 ${className}`}
        aria-label={`Qué es ${g.titulo}`}
      >
        {children ?? g.titulo}
        <span aria-hidden className="inline-grid place-items-center size-4 rounded-full border border-current text-[10px] font-bold no-underline opacity-70">?</span>
      </button>
      <dialog
        ref={dialogo}
        onClose={() => setAbierto(false)}
        onClick={(e) => { if (e.target === dialogo.current) setAbierto(false); }}
        className="m-0 mt-auto sm:m-auto w-full max-w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-0 backdrop:bg-black/40 text-tinta"
      >
        <div className="p-6">
          <p className="text-lg font-black text-marino">{g.titulo}</p>
          <p className="mt-2 leading-relaxed">{g.texto}</p>
          <button onClick={() => setAbierto(false)} className="mt-5 w-full rounded-lg bg-marino text-white font-bold py-2.5">Entendido</button>
        </div>
      </dialog>
    </>
  );
}
