"use client";

import { useEffect, useState } from "react";
import { LECCIONES } from "@/lib/lecciones";

// El progreso (qué lecciones ya respondió bien) queda en el celular: es solo una comodidad.
const CLAVE = "lecciones_ok";
const leer = (): string[] => {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? "[]"); } catch { return []; }
};

export function Lecciones() {
  const [hechas, setHechas] = useState<string[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);

  useEffect(() => { setHechas(leer()); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const marcar = (id: string) => {
    const nuevo = [...new Set([...hechas, id])];
    setHechas(nuevo);
    try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch { /* sin almacenamiento: no pasa nada */ }
  };

  return (
    <>
      <p className="text-sm text-center text-tenue">{hechas.length} de {LECCIONES.length} lecciones completas</p>
      {LECCIONES.map((l) => {
        const abiertaEsta = abierta === l.id;
        return (
          <section key={l.id} className="rounded-2xl bg-white shadow-sm">
            <button className="w-full flex items-center gap-3 p-4 text-left"
              onClick={() => { setAbierta(abiertaEsta ? null : l.id); setElegida(null); }} aria-expanded={abiertaEsta}>
              <span className="text-2xl">{l.emoji}</span>
              <span className="flex-1 font-semibold">{l.titulo}</span>
              {hechas.includes(l.id) && <span className="text-sube text-sm font-bold">✓</span>}
            </button>
            {abiertaEsta && (
              <div className="px-5 pb-5 space-y-3">
                {l.parrafos.map((p) => <p key={p} className="leading-relaxed">{p}</p>)}
                <div className="rounded-xl bg-fondo p-4">
                  <p className="font-semibold mb-2">{l.pregunta.texto}</p>
                  <div className="space-y-2">
                    {l.pregunta.opciones.map((o, i) => {
                      const respondida = elegida != null;
                      const bien = i === l.pregunta.correcta;
                      const estilo = !respondida ? "bg-white" : bien ? "bg-green-100 border-sube" : i === elegida ? "bg-red-100 border-baja" : "bg-white opacity-60";
                      return (
                        <button key={o} disabled={respondida}
                          onClick={() => { setElegida(i); if (bien) marcar(l.id); }}
                          className={`w-full text-left rounded-lg border border-borde px-3 py-2 ${estilo}`}>
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  {elegida != null && (
                    <p className="mt-3 text-sm">
                      <b>{elegida === l.pregunta.correcta ? "¡Bien! " : "Casi. "}</b>{l.pregunta.porque}
                      {elegida !== l.pregunta.correcta && (
                        <button onClick={() => setElegida(null)} className="block mt-2 underline">Probar de nuevo</button>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
