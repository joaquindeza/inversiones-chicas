"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { fmtDinero, fmtPct, colorSigno } from "@/lib/formato";
import type { Preferencias } from "@/lib/preferencias";

type Ctx = Preferencias & { cambiar: (p: Partial<Preferencias>) => void; mep: number };

const PrefsCtx = createContext<Ctx | null>(null);

export function PreferenciasProvider({ inicial, children }: { inicial: Preferencias; children: React.ReactNode }) {
  const [prefs, setPrefs] = useState(inicial);
  const cambiar = useCallback((p: Partial<Preferencias>) => {
    setPrefs((prev) => {
      const nuevo = { ...prev, ...p };
      document.cookie = `prefs=${encodeURIComponent(JSON.stringify(nuevo))}; path=/; max-age=31536000; samesite=lax`;
      return nuevo;
    });
  }, []);
  return <PrefsCtx.Provider value={{ ...prefs, cambiar, mep: 0 }}>{children}</PrefsCtx.Provider>;
}

/** El MEP actual para convertir a pesos lo que no trae su propio valor en ARS. */
export function MepProvider({ valor, children }: { valor: number; children: React.ReactNode }) {
  const ctx = usePreferencias();
  return <PrefsCtx.Provider value={{ ...ctx, mep: valor }}>{children}</PrefsCtx.Provider>;
}

export function usePreferencias(): Ctx {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error("Falta PreferenciasProvider");
  return c;
}

/**
 * Un monto. Se guarda y se piensa en USD; en modo pesos se muestra en ARS: con `ars` si el dato
 * trae su valor histórico en pesos (ej. un aporte), o convertido al MEP actual.
 * Con el ojo cerrado se tapa (los porcentajes siguen visibles).
 */
export function Monto({ usd, ars, signo, className = "" }: {
  usd: number | null | undefined; ars?: number | null; signo?: boolean; className?: string;
}) {
  const { oculto, moneda, mep } = usePreferencias();
  if (oculto) return <span className={`num tracking-widest text-tenue ${className}`} aria-label="Monto oculto">••••</span>;
  const valor = moneda === "USD" ? usd : ars ?? (usd == null || !mep ? null : usd * mep);
  const texto = fmtDinero(valor, moneda);
  return (
    <span className={`num ${signo ? colorSigno(valor) : ""} ${className}`}>
      {signo && valor != null && valor > 0 ? "+" : ""}{texto}
    </span>
  );
}

export function Pct({ valor, signo, className = "" }: { valor: number | null | undefined; signo?: boolean; className?: string }) {
  return <span className={`num ${signo ? colorSigno(valor) : ""} ${className}`}>{fmtPct(valor, signo)}</span>;
}

/** Los dos botones de arriba a la derecha: ojo y USD/ARS. */
export function BotonesVista({ oscuro }: { oscuro?: boolean }) {
  const { oculto, moneda, cambiar } = usePreferencias();
  const base = `h-9 rounded-full text-sm font-semibold transition ${oscuro
    ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white hover:bg-fondo text-marino border border-borde"}`;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => cambiar({ oculto: !oculto })}
        className={`${base} w-9 grid place-items-center`}
        aria-pressed={oculto}
        title={oculto ? "Mostrar montos" : "Ocultar montos (se ven solo los %)"}
      >
        {oculto ? <OjoCerrado /> : <Ojo />}
      </button>
      <div className={`${base} p-0.5 flex`} role="group" aria-label="Moneda">
        {(["USD", "ARS"] as const).map((m) => (
          <button
            key={m}
            onClick={() => cambiar({ moneda: m })}
            aria-pressed={moneda === m}
            className={`px-3 h-8 rounded-full ${moneda === m ? (oscuro ? "bg-white text-marino" : "bg-marino text-white") : ""}`}
            title={m === "USD" ? "Ver en dólares MEP" : "Ver en pesos (al MEP de cada fecha)"}
          >
            {m === "USD" ? "US$" : "$"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Ojo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function OjoCerrado() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
