"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { cambiarFrecuencia, descartarAlerta, guardarCredencial, sincronizarAhora, type EstadoSync } from "@/app/admin/sync-actions";
import { fmtFechaHora } from "@/lib/formato";

export type UltimoSync = { id: number; inicio: string; fin: string | null; disparo: string; estado: string; error: string | null; resumen: unknown } | null;

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  corriendo: { texto: "sincronizando…", clase: "text-aviso" },
  ok: { texto: "todo bien", clase: "text-sube" },
  parcial: { texto: "con avisos", clase: "text-aviso" },
  error: { texto: "falló", clase: "text-baja" },
};

/** Estado del último sync + botón "Sincronizar ahora". Mientras corre, refresca cada 3 segundos. */
export function PanelSync({ ultimo, frecuencia, conDetalle }: { ultimo: UltimoSync; frecuencia: string; conDetalle?: boolean }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [mensaje, setMensaje] = useState<EstadoSync>({});
  const corriendo = ultimo?.estado === "corriendo";

  useEffect(() => {
    if (!corriendo) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [corriendo, router]);

  const e = ultimo ? ESTADOS[ultimo.estado] ?? { texto: ultimo.estado, clase: "" } : null;
  return (
    <div className="text-sm space-y-2">
      {ultimo ? (
        <p>
          Última: <b>{fmtFechaHora(ultimo.inicio)}</b> ({ultimo.disparo === "cron" ? "automática" : ultimo.disparo}) ·{" "}
          <span className={`font-semibold ${e!.clase}`}>{e!.texto}</span>
          {ultimo.error && <span className="block text-tenue mt-0.5">{ultimo.error}</span>}
        </p>
      ) : <p className="text-tenue">Nunca se sincronizó.</p>}
      <p className="text-tenue">Automático: <b className="text-tinta">{frecuencia === "6h" ? "cada 6 horas" : frecuencia === "diaria" ? "una vez por día (20 hs)" : "apagado"}</b></p>
      <div className="flex items-center gap-3">
        <button
          disabled={pendiente || corriendo}
          onClick={() => start(async () => { setMensaje(await sincronizarAhora()); router.refresh(); })}
          className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold disabled:opacity-60"
        >
          {corriendo || pendiente ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
        {mensaje.error && <span className="text-baja">{mensaje.error}</span>}
      </div>
      {conDetalle && ultimo && !corriendo && <DetalleSync resumen={ultimo.resumen} />}
    </div>
  );
}

type ResumenHermana = {
  error?: string; omitida?: string; efectivo_ars?: number; efectivo_usd?: number; posiciones?: number;
  operaciones_nuevas?: string[]; tickers_nuevos?: string[]; total_usd?: number; avisos?: string[];
};

function DetalleSync({ resumen }: { resumen: unknown }) {
  const r = (resumen ?? {}) as Record<string, unknown>;
  const hermanas = Object.entries(r).filter(([k]) => !["mep", "mep_dias", "indices"].includes(k)) as [string, ResumenHermana][];
  const mep = r.mep as { valor: number; fecha: string; fuente: string } | undefined;
  return (
    <div className="rounded-lg bg-fondo p-3 space-y-2">
      {mep && <p>MEP {mep.valor.toLocaleString("es-AR")} ({mep.fuente}) · {String(r.mep_dias ?? 0)} días de histórico actualizados</p>}
      {hermanas.map(([nombre, h]) => (
        <div key={nombre}>
          <p className="font-semibold">{nombre}</p>
          {h.omitida && <p className="text-tenue">Omitida: {h.omitida}.</p>}
          {h.error && <p className="text-baja">Error: {h.error}</p>}
          {h.efectivo_ars != null && (
            <p className="text-tenue">
              Efectivo $ {Math.round(h.efectivo_ars).toLocaleString("es-AR")}
              {h.efectivo_usd ? ` + US$ ${h.efectivo_usd}` : ""} · {h.posiciones} posiciones ·{" "}
              {h.operaciones_nuevas?.length ? `operaciones nuevas: ${h.operaciones_nuevas.join(", ")}` : "sin operaciones nuevas"}
              {h.tickers_nuevos?.length ? ` · tickers nuevos: ${h.tickers_nuevos.join(", ")}` : ""}
            </p>
          )}
          {h.avisos?.map((a) => <p key={a} className="text-aviso">⚠ {a}</p>)}
        </div>
      ))}
    </div>
  );
}

export function SelectorFrecuencia({ actual }: { actual: string }) {
  const [valor, setValor] = useState(actual);
  const [mensaje, setMensaje] = useState<EstadoSync>({});
  const [pendiente, start] = useTransition();
  const opciones = [["off", "Apagado"], ["6h", "Cada 6 horas"], ["diaria", "Diaria"]] as const;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="inline-flex rounded-full border border-borde bg-white p-0.5" role="group" aria-label="Sync automático">
        {opciones.map(([v, t]) => (
          <button key={v} disabled={pendiente} aria-pressed={valor === v}
            onClick={() => start(async () => { const r = await cambiarFrecuencia(v); setMensaje(r); if (!r.error) setValor(v); })}
            className={`px-4 py-1.5 rounded-full ${valor === v ? "bg-marino text-white font-semibold" : "text-tinta hover:bg-fondo"}`}>
            {t}
          </button>
        ))}
      </div>
      {mensaje.error && <span className="text-baja">{mensaje.error}</span>}
      {mensaje.ok && <span className="text-sube">{mensaje.ok}</span>}
    </div>
  );
}

export type CredencialInfo = { hermana_id: number; nombre: string; color: string; usuario_mascara: string | null; cargada_el: string | null; ultimo_login_ok: string | null };

export function CredencialesIOL({ lista }: { lista: CredencialInfo[] }) {
  return (
    <div className="space-y-3">
      {lista.map((c) => <FilaCredencial key={c.hermana_id} c={c} />)}
    </div>
  );
}

function FilaCredencial({ c }: { c: CredencialInfo }) {
  const [abierta, setAbierta] = useState(!c.cargada_el);
  const [estado, accion, guardando] = useActionState<EstadoSync, FormData>(async (p, f) => {
    const r = await guardarCredencial(p, f);
    if (r.ok) setAbierta(false);
    return r;
  }, {});
  const campo = "rounded-md border border-borde bg-completar px-2 py-1.5 text-sm w-full";
  return (
    <div className="rounded-lg border border-borde p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p><b style={{ color: c.color }}>{c.nombre}</b>{" "}
          {c.cargada_el
            ? <span className="text-tenue">· usuario {c.usuario_mascara} · {c.ultimo_login_ok ? `último ingreso OK ${fmtFechaHora(c.ultimo_login_ok)}` : "todavía sin probar"}</span>
            : <span className="text-aviso">· sin cargar</span>}
        </p>
        {c.cargada_el && !abierta && <button onClick={() => setAbierta(true)} className="text-marino hover:underline">Cambiar</button>}
      </div>
      {abierta && (
        <form action={accion} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 mt-2 items-end" key={estado.ok}>
          <input type="hidden" name="hermana_id" value={c.hermana_id} />
          <label className="flex flex-col gap-1">Usuario de IOL<input name="usuario" required autoComplete="off" className={campo} /></label>
          <label className="flex flex-col gap-1">Clave de IOL<input name="clave" type="password" required autoComplete="new-password" className={campo} /></label>
          <button disabled={guardando} className="rounded-md bg-marino text-white px-4 py-1.5 font-semibold disabled:opacity-60">Guardar</button>
        </form>
      )}
      {estado.error && <p className="text-baja mt-1">{estado.error}</p>}
      {estado.ok && <p className="text-sube mt-1">{estado.ok}</p>}
    </div>
  );
}

type Alerta = { id: number; tipo: string; mensaje: string; datos: unknown };

/** Un aviso del sync. El de aporte sin registrar trae el botón para cargarlo en un clic. */
export function ItemAlerta({ a }: { a: Alerta }) {
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const d = (a.datos ?? {}) as { hermana_id?: number; monto?: number; moneda?: string };
  const cargar = a.tipo === "aporte_sin_registrar" || a.tipo === "retiro_sin_registrar";
  const href = `/admin/movimientos?nuevo=${a.tipo === "aporte_sin_registrar" ? "Aporte" : "Retiro"}&h=${d.hermana_id}&monto=${d.monto}&moneda=${d.moneda ?? "ARS"}`;
  return (
    <li className="flex flex-col gap-1">
      <span>{a.tipo === "orden_pendiente" ? "⏳" : "⚠"} {a.mensaje}</span>
      <span className="flex gap-3 text-xs">
        {cargar && <Link href={href} className="font-semibold text-marino hover:underline">Cargar {a.tipo === "aporte_sin_registrar" ? "el aporte" : "el retiro"} →</Link>}
        <button disabled={pendiente} onClick={() => start(async () => { await descartarAlerta(a.id); router.refresh(); })}
          className="text-tenue hover:text-tinta">Descartar</button>
      </span>
    </li>
  );
}
