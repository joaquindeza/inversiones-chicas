"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dona, type Porcion } from "@/components/graficos";
import { Logo } from "@/components/logo";
import { Monto, Pct } from "@/components/preferencias";
import { fmtCant, fmtPct } from "@/lib/formato";
import { etiquetaPrecio, mercadoAbierto, precioVencido } from "@/lib/mercado";
import { pesosIdeales, sugerirCompras } from "@/lib/rebalanceo";
import { borrarPlan, guardarPlan, refrescarPrecios, type Estado, type Ideal, type Plan } from "./actions";
import { fecha, num, type Categoria, type TickerInfo } from "./comun";
import { EditorIdeal } from "./editor-ideal";

type Nivel = "Bajo" | "Medio" | "Alto";
type Pos = { ticker: string; nombre: string; categoria: string; color: string; usd: number; cantidad: number; precio: number };
type Fila = { id: number; ticker: string; cantidad: string; categoriaId: number | null };
type Venta = { id: number; ticker: string; cantidad: string };

const NIVELES: { nivel: Nivel; titulo: string; color: string; fondo: string }[] = [
  { nivel: "Bajo", titulo: "RIESGO BAJO", color: "#15803D", fondo: "#dcfce7" },
  { nivel: "Medio", titulo: "RIESGO MEDIO", color: "#B45309", fondo: "#fef3c7" },
  { nivel: "Alto", titulo: "RIESGO ALTO", color: "#B91C1C", fondo: "#fee2e2" },
];
const UMBRAL_DESVIO = 0.05;
let proximoId = 1;
const nuevoId = () => proximoId++;
const pesos = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
const pesosNominal = (n: number) => `$ ${n.toLocaleString("es-AR", { maximumFractionDigits: n < 10_000 ? 2 : 0 })}`;
const up = (s: string) => s.trim().toUpperCase();

export function EditorPlan(p: {
  hermana: { id: number; nombre: string; color: string }; todas: number[]; mes: string;
  plan: Plan | null; anterior: Plan | null; mep: number;
  tickers: TickerInfo[]; categorias: Categoria[];
  posiciones: Pos[]; efectivoUsd: number; ejecutado: Record<string, number>;
  ideales: Ideal[]; ideal: Ideal | null; hoy: string; tabInicial: "plan" | "tenencias" | "ideal";
}) {
  const router = useRouter();
  const [tab, setTab] = useState(p.tabInicial);
  const [capital, setCapital] = useState(p.plan ? String(p.plan.capital) : "");
  const [tc, setTc] = useState(String(Math.round((p.plan?.tc || p.mep) * 100) / 100));
  const [origen, setOrigen] = useState<Plan["origen"]>(p.plan?.origen ?? "Aporte nuevo");
  const [pctNivel, setPctNivel] = useState<Record<Nivel, string>>({
    Bajo: String(p.plan?.pctNivel.Bajo ?? 0), Medio: String(p.plan?.pctNivel.Medio ?? 0), Alto: String(p.plan?.pctNivel.Alto ?? 0),
  });
  const [estado, setEstado] = useState<Estado>({});
  const [guardando, start] = useTransition();

  const info = useMemo(() => new Map(p.tickers.map((t) => [t.ticker, t])), [p.tickers]);
  const catPorId = useMemo(() => new Map(p.categorias.map((c) => [c.id, c])), [p.categorias]);
  const posDe = useMemo(() => new Map(p.posiciones.map((x) => [x.ticker, x])), [p.posiciones]);

  const cap = num(capital);
  const tcN = num(tc) || p.mep;
  const capUsd = cap / tcN;

  /** Precio de un nominal en pesos (las ONs cotizan cada 100 nominales). */
  const precioArs = useCallback((ticker: string): number | null => {
    const t = info.get(up(ticker));
    if (t?.precio != null && t.precio > 0) return (t.moneda === "USD" ? t.precio * tcN : t.precio) / t.cotizaCada;
    const pos = posDe.get(up(ticker));
    return pos?.precio ? pos.precio * tcN : null;
  }, [info, posDe, tcN]);

  const [filas, setFilas] = useState<Record<Nivel, Fila[]>>(() => desdePlan(p.plan, precioArs));
  const [ventas, setVentas] = useState<Venta[]>(() => (p.plan?.ventas ?? []).map((v) => ({ id: nuevoId(), ticker: v.ticker, cantidad: String(v.cantidad) })));

  // ---- precios: al entrar se piden a IOL los que estén viejos (mercado abierto: >10 min; cerrado: antes del último cierre)
  const [precios, setPrecios] = useState<{ cargando: boolean; error?: string }>({ cargando: false });
  const pedidos = useRef(new Set<string>());
  const pedirPrecios = useCallback(async (lista: string[], forzar = false) => {
    const faltan = [...new Set(lista.map(up))].filter((t) => {
      const x = info.get(t);
      if (x && !x.cotizable) return false;
      return (forzar || !pedidos.current.has(t)) && (forzar || precioVencido(x?.actualizado));
    });
    if (!faltan.length) return;
    faltan.forEach((t) => pedidos.current.add(t));
    setPrecios({ cargando: true });
    const r = await refrescarPrecios(faltan);
    setPrecios({ cargando: false, error: r.error });
    if (r.actualizados) router.refresh();
  }, [info, router]);
  useEffect(() => {
    const todos = [
      ...p.posiciones.map((x) => x.ticker),
      ...(p.ideal?.items.map((i) => i.ticker) ?? []),
      ...NIVELES.flatMap((n) => filas[n.nivel].map((f) => f.ticker)),
      ...ventas.map((v) => v.ticker),
    ].filter(Boolean);
    void pedirPrecios(todos);
    // solo al entrar: después se piden a medida que se agregan tickers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pesos_ = useMemo(() => (p.ideal ? pesosIdeales({
    categorias: p.ideal.categorias.map((c) => ({ categoriaId: c.categoriaId, pct: c.pct / 100 })),
    items: p.ideal.items.map((i) => ({ ticker: i.ticker, categoriaId: i.categoriaId, pct: i.pct / 100 })),
  }) : null), [p.ideal]);

  const categoriaDe = (f: { ticker: string; categoriaId: number | null }) => {
    const t = info.get(up(f.ticker));
    if (t?.categoria) return { nombre: t.categoria, color: t.color ?? "#9CA3AF", auto: true };
    const c = f.categoriaId ? catPorId.get(f.categoriaId) : null;
    return c ? { nombre: c.nombre, color: c.color, auto: false } : null;
  };
  const montoFila = (f: Fila) => num(f.cantidad) * (precioArs(f.ticker) ?? 0);
  const presupuesto = (n: Nivel) => cap * (num(pctNivel[n]) / 100);
  const sumaNiveles = NIVELES.reduce((a, n) => a + num(pctNivel[n.nivel]), 0);
  const montoVenta = (v: Venta) => num(v.cantidad) * (precioArs(v.ticker) ?? 0);

  // ---- proyección ("Tenencias estimadas"); el efectivo va dentro de Disponibilidades, como en la cartera
  const proy = useMemo(() => {
    const compras = new Map<string, number>();
    for (const n of NIVELES) for (const f of filas[n.nivel]) {
      const t = up(f.ticker);
      if (t) compras.set(t, (compras.get(t) ?? 0) + montoFila(f) / tcN);
    }
    const vendido = new Map<string, number>();
    for (const v of ventas) {
      const t = up(v.ticker);
      if (t) vendido.set(t, (vendido.get(t) ?? 0) + montoVenta(v) / tcN);
    }
    const totalCompras = [...compras.values()].reduce((a, b) => a + b, 0);
    const totalVentas = [...vendido.values()].reduce((a, b) => a + b, 0);
    const efeProy = p.efectivoUsd + (origen === "Aporte nuevo" ? capUsd : 0) - totalCompras + totalVentas;

    const tickers = new Set([...posDe.keys(), ...compras.keys(), ...vendido.keys(), ...(pesos_?.ticker.keys() ?? [])]);
    const filaDe = (t: string) => NIVELES.flatMap((n) => filas[n.nivel]).find((f) => up(f.ticker) === t);
    const lista: ItemProy[] = [...tickers].map((t) => {
      const actual = posDe.get(t)?.usd ?? 0;
      const c = categoriaDe({ ticker: t, categoriaId: filaDe(t)?.categoriaId ?? null });
      return {
        ticker: t, categoria: posDe.get(t)?.categoria ?? c?.nombre ?? "Otros", color: posDe.get(t)?.color ?? c?.color ?? "#9CA3AF",
        actual, proyectado: Math.max(0, actual + (compras.get(t) ?? 0) - (vendido.get(t) ?? 0)), ideal: pesos_?.ticker.get(t) ?? null,
      };
    });
    const disp = p.categorias.find((c) => c.nombre === "Disponibilidades");
    lista.push({ ticker: "Efectivo", categoria: "Disponibilidades", color: disp?.color ?? "#64748B", actual: p.efectivoUsd, proyectado: Math.max(0, efeProy), ideal: null, efectivo: true });
    const totalActual = lista.reduce((a, x) => a + x.actual, 0);
    const totalProy = lista.reduce((a, x) => a + x.proyectado, 0);
    return { lista, efeProy, totalActual, totalProy, totalCompras, totalVentas, compras, vendido };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, ventas, pctNivel, capital, tc, origen, p.efectivoUsd, posDe, info, pesos_]);

  // ---- sugerencia según la ideal (solo compras): reparte el capital entre lo que más falta
  const totalDespues = proy.totalActual + (origen === "Aporte nuevo" ? capUsd : 0);
  const actualNeto = (t: string) => (posDe.get(t)?.usd ?? 0) - (proy.vendido.get(t) ?? 0);
  const candidatos = (tickers: string[]) => tickers.flatMap((t) => {
    const pr = precioArs(t);
    return pr ? [{ ticker: t, objetivoUsd: (pesos_?.ticker.get(t) ?? 0) * totalDespues, actualUsd: actualNeto(t), precioUsd: pr / tcN }] : [];
  });
  const sugerencia = useMemo(() => {
    if (!pesos_ || !(capUsd > 0)) return null;
    return sugerirCompras(candidatos([...pesos_.ticker.keys()]), capUsd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesos_, capUsd, totalDespues, ventas, info, tcN]);

  /** Completa los nominales de los tickers de un nivel según la ideal, con el presupuesto del nivel. */
  const completarNivel = (n: Nivel) => {
    const fs = filas[n];
    const enIdeal = fs.filter((f) => pesos_?.ticker.has(up(f.ticker)));
    const fijo = fs.filter((f) => !enIdeal.includes(f)).reduce((a, f) => a + montoFila(f), 0);
    // lo que otros niveles ya compran de esos tickers cuenta como que ya lo tiene
    const otros = (t: string) => NIVELES.filter((x) => x.nivel !== n).flatMap((x) => filas[x.nivel]).filter((f) => up(f.ticker) === t).reduce((a, f) => a + montoFila(f) / tcN, 0);
    const cands = candidatos(enIdeal.map((f) => up(f.ticker))).map((c) => ({ ...c, actualUsd: c.actualUsd + otros(c.ticker) }));
    const r = sugerirCompras(cands, Math.max(0, presupuesto(n) - fijo) / tcN);
    const cant = new Map(r.compras.map((c) => [c.ticker, c.cantidad]));
    setFilas({ ...filas, [n]: fs.map((f) => (enIdeal.includes(f) ? { ...f, cantidad: String(cant.get(up(f.ticker)) ?? 0) } : f)) });
  };
  const agregarSugerido = (n: Nivel, ticker: string, cantidad: number) => {
    const ya = filas[n].find((f) => up(f.ticker) === ticker);
    setFilas({ ...filas, [n]: ya ? filas[n].map((f) => (f === ya ? { ...f, cantidad: String(cantidad) } : f)) : [...filas[n], { id: nuevoId(), ticker, cantidad: String(cantidad), categoriaId: null }] });
  };
  const usarTodaLaSugerencia = (n: Nivel) => {
    if (!sugerencia) return;
    let nuevo = { ...filas };
    for (const c of sugerencia.compras) {
      const donde = NIVELES.find((x) => nuevo[x.nivel].some((f) => up(f.ticker) === c.ticker))?.nivel ?? n;
      const ya = nuevo[donde].find((f) => up(f.ticker) === c.ticker);
      nuevo = { ...nuevo, [donde]: ya ? nuevo[donde].map((f) => (f === ya ? { ...f, cantidad: String(c.cantidad) } : f)) : [...nuevo[donde], { id: nuevoId(), ticker: c.ticker, cantidad: String(c.cantidad), categoriaId: null }] };
    }
    setFilas(nuevo);
  };

  const planActual = (): Plan => ({
    mes: p.mes, capital: cap, tc: tcN, origen,
    pctNivel: { Bajo: num(pctNivel.Bajo), Medio: num(pctNivel.Medio), Alto: num(pctNivel.Alto) },
    items: NIVELES.flatMap((n) => filas[n.nivel].filter((f) => f.ticker.trim()).map((f) => ({
      nivel: n.nivel, ticker: f.ticker, categoriaId: f.categoriaId, cantidad: num(f.cantidad), precioArs: precioArs(f.ticker),
      pct: presupuesto(n.nivel) ? (montoFila(f) / presupuesto(n.nivel)) * 100 : null,
    }))),
    ventas: ventas.filter((v) => v.ticker.trim()).map((v) => ({ ticker: v.ticker, cantidad: num(v.cantidad), precioArs: precioArs(v.ticker) })),
  });
  const guardar = (hermanas: number[]) => start(async () => {
    const r = await guardarPlan(hermanas, planActual());
    setEstado(r);
    if (r.ok) router.refresh();
  });
  const traer = (pl: Plan) => {
    setCapital(String(pl.capital)); setOrigen(pl.origen);
    setPctNivel({ Bajo: String(pl.pctNivel.Bajo), Medio: String(pl.pctNivel.Medio), Alto: String(pl.pctNivel.Alto) });
    setFilas(desdePlan(pl, precioArs));
    setVentas(pl.ventas.map((v) => ({ id: nuevoId(), ticker: v.ticker, cantidad: String(v.cantidad) })));
  };

  const campo = "rounded-md border border-borde bg-completar px-2 py-1.5 text-sm";
  const grupos = agrupar(proy.lista, p.categorias, pesos_?.categoria ?? null);
  const porciones: Porcion[] = grupos.filter((g) => g.proyectado > 0).map((g) => ({
    nombre: g.categoria, color: g.color, usd: g.proyectado, pct: proy.totalProy ? g.proyectado / proy.totalProy : null,
    hijos: g.items.filter((x) => x.proyectado > 0).map((x) => ({ nombre: x.ticker, usd: x.proyectado, logo: !x.efectivo })),
  }));
  const fechasPrecio = p.tickers.filter((t) => t.precio != null && (posDe.has(t.ticker) || pesos_?.ticker.has(t.ticker)));
  const masReciente = fechasPrecio.map((t) => t.precioFecha ?? t.actualizado).filter(Boolean).sort().at(-1);
  const nivelDe = (t: string) => NIVELES.find((n) => filas[n.nivel].some((f) => up(f.ticker) === t));

  const celdaPrecio = (ticker: string) => {
    const t = info.get(up(ticker));
    const pr = precioArs(ticker);
    if (!ticker.trim()) return null;
    if (!pr) return <span className="text-xs text-aviso">{t && !t.cotizable ? "no cotiza en IOL" : precios.cargando ? "buscando…" : "sin precio"}</span>;
    return (
      <span className="inline-flex flex-col items-end leading-tight">
        <span className="num">{pesosNominal(pr)}{t && t.cotizaCada > 1 ? <span className="text-[10px] text-tenue"> /VN</span> : null}</span>
        <span className="text-[10px] text-tenue">{t && t.cotizaCada > 1 && t.precio ? `c/${t.cotizaCada}: ${pesos(t.precio)} · ` : ""}{etiquetaPrecio(t?.precioFecha, t?.actualizado)}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-borde bg-white p-1 text-sm">
          {([["plan", "Planificación"], ["tenencias", "Tenencias estimadas"], ["ideal", "Cartera ideal"]] as const).map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-md ${tab === k ? "bg-marino text-white font-semibold" : ""}`}>{t}</button>
          ))}
        </div>
        {tab !== "ideal" && !p.plan && p.anterior && (
          <button onClick={() => traer(p.anterior!)} className="text-sm text-marino underline">Traer el plan del mes anterior</button>
        )}
        {tab !== "ideal" && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {estado.error && <span className="text-baja text-sm">{estado.error}</span>}
            {estado.ok && <span className="text-sube text-sm">{estado.ok}</span>}
            {p.plan && (
              <button disabled={guardando} onClick={() => { if (confirm("¿Borrar el plan de este mes?")) start(async () => { setEstado(await borrarPlan(p.hermana.id, p.mes)); router.refresh(); }); }}
                className="text-sm text-baja hover:underline">Borrar</button>
            )}
            <button disabled={guardando} onClick={() => guardar(p.todas)} className="rounded-lg border border-marino text-marino px-4 py-2 text-sm font-semibold disabled:opacity-60">
              Guardar para las tres
            </button>
            <button disabled={guardando} onClick={() => guardar([p.hermana.id])} className="rounded-lg bg-marino text-white px-4 py-2 text-sm font-semibold disabled:opacity-60">
              {guardando ? "Guardando…" : `Guardar para ${p.hermana.nombre}`}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-tenue flex flex-wrap items-center gap-2">
        <span>
          <span className={`inline-block size-2 rounded-full mr-1.5 ${mercadoAbierto() ? "bg-sube" : "bg-tenue"}`} />
          {mercadoAbierto() ? "Mercado abierto: precios en vivo de IOL." : `Mercado cerrado: se usa el último precio operado${masReciente ? ` (${etiquetaPrecio(masReciente, null)})` : ""}.`}
        </span>
        {precios.cargando && <span>Actualizando precios…</span>}
        {precios.error && <span className="text-aviso">{precios.error}</span>}
        <button disabled={precios.cargando} onClick={() => void pedirPrecios([...posDe.keys(), ...(pesos_?.ticker.keys() ?? []), ...NIVELES.flatMap((n) => filas[n.nivel].map((f) => f.ticker)), ...ventas.map((v) => v.ticker)].filter(Boolean), true)}
          className="text-marino underline disabled:opacity-50">Actualizar precios</button>
      </p>

      {tab === "ideal" ? (
        <EditorIdeal
          hermana={p.hermana} todas={p.todas} hoy={p.hoy} ideales={p.ideales} categorias={p.categorias} tickers={p.tickers}
          posiciones={p.posiciones} efectivoUsd={p.efectivoUsd} precioArs={precioArs} pedirPrecios={pedirPrecios}
        />
      ) : tab === "plan" ? (
        <>
          <section className="rounded-xl bg-white border border-borde p-4 flex flex-wrap items-end gap-5">
            <label className="flex flex-col gap-1 text-sm">Capital a invertir este mes
              <span className="flex items-center gap-2">$ <input value={capital} onChange={(e) => setCapital(e.target.value)} inputMode="decimal" className={`${campo} w-40`} placeholder="400000" /></span>
            </label>
            <p className="text-2xl font-black text-marino">{pesos(cap)} <span className="text-sm font-normal text-tenue">≈ <Monto usd={capUsd} /></span></p>
            <label className="flex flex-col gap-1 text-sm">¿De dónde sale la plata?
              <select value={origen} onChange={(e) => setOrigen(e.target.value as Plan["origen"])} className={campo}>
                <option>Aporte nuevo</option><option>Efectivo disponible</option>
              </select>
            </label>
            <p className="text-sm text-tenue">Efectivo hoy: <Monto usd={p.efectivoUsd} /></p>
            <div className="text-sm ml-auto text-right">
              <p className={`font-semibold ${Math.abs(sumaNiveles - 100) < 0.01 ? "text-sube" : "text-baja"}`}>
                Niveles: {sumaNiveles}% {Math.abs(sumaNiveles - 100) < 0.01 ? "✓" : "(tiene que dar 100%)"}
              </p>
              {cap > 0 && (() => {
                const usado = NIVELES.reduce((a, n) => a + filas[n.nivel].reduce((b, f) => b + montoFila(f), 0), 0);
                return <p className={usado > cap + 0.5 ? "text-baja font-semibold" : "text-tenue"}>Usado {pesos(usado)} · {usado > cap ? `te pasás ${pesos(usado - cap)}` : `sobran ${pesos(cap - usado)}`}</p>;
              })()}
            </div>
          </section>

          <Sugerencia
            hayIdeal={!!p.ideal} sugerencia={sugerencia} info={info} tcN={tcN} nivelDe={nivelDe} filas={filas}
            pesoIdeal={(t) => pesos_?.ticker.get(t) ?? 0} pesoHoy={(t) => (proy.totalActual ? (posDe.get(t)?.usd ?? 0) / proy.totalActual : 0)}
            pesoDespues={(t, usd) => (totalDespues ? (actualNeto(t) + usd) / totalDespues : 0)}
            agregar={agregarSugerido} usarTodo={usarTodaLaSugerencia} irAIdeal={() => setTab("ideal")}
          />

          {NIVELES.map((n) => {
            const fs = filas[n.nivel];
            const montoNivel = presupuesto(n.nivel);
            const usado = fs.reduce((a, f) => a + montoFila(f), 0);
            const hayDeLaIdeal = fs.some((f) => pesos_?.ticker.has(up(f.ticker)));
            return (
              <section key={n.nivel} className="rounded-xl bg-white border border-borde overflow-hidden" style={{ borderLeft: `4px solid ${n.color}` }}>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-borde">
                  <span className="rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: n.fondo, color: n.color }}>{n.titulo}</span>
                  {fs.length > 0 && montoNivel > 0 && (
                    <span className={`text-xs ${usado > montoNivel + 0.5 ? "text-baja font-semibold" : "text-tenue"}`}>
                      usado {pesos(usado)} · {usado > montoNivel ? `te pasás ${pesos(usado - montoNivel)}` : `quedan ${pesos(montoNivel - usado)}`}
                    </span>
                  )}
                  {hayDeLaIdeal && montoNivel > 0 && (
                    <button onClick={() => completarNivel(n.nivel)} className="text-xs text-marino underline" title="Reparte el presupuesto del nivel entre sus tickers, en nominales, para acercarse a la cartera ideal">
                      Completar nominales según la ideal
                    </button>
                  )}
                  <span className="ml-auto text-sm text-tenue">% del capital:</span>
                  <input value={pctNivel[n.nivel]} onChange={(e) => setPctNivel({ ...pctNivel, [n.nivel]: e.target.value })} inputMode="decimal" className={`${campo} w-16 text-right`} />
                  <span className="text-sm">%</span>
                  <b className="min-w-24 text-right">{pesos(montoNivel)}</b>
                </div>
                {fs.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-tenue">
                          <th className="text-left px-4 py-2">Ticker</th><th className="text-left px-2">Categoría</th>
                          <th className="text-right px-2">Nominales</th><th className="text-right px-2">Precio</th><th className="text-right px-2">Monto</th>
                          <th className="text-right px-2">USD</th><th className="text-right px-2">% del nivel</th><th className="text-right px-2">Ideal</th>
                          <th className="text-right px-2">Comprado</th><th className="px-2">Estado</th><th />
                        </tr>
                      </thead>
                      <tbody>
                        {fs.map((f) => {
                          const cat = categoriaDe(f);
                          const tk = up(f.ticker);
                          const monto = montoFila(f);
                          const usd = monto / tcN;
                          const comprado = p.ejecutado[tk] ?? 0;
                          const est = !tk ? "" : comprado >= usd * 0.95 && usd > 0 ? "✓ hecho" : comprado > 0 ? "parcial" : "pendiente";
                          const cambiar = (c: Partial<Fila>) => setFilas({ ...filas, [n.nivel]: fs.map((x) => (x.id === f.id ? { ...x, ...c } : x)) });
                          const ideal = pesos_?.ticker.get(tk);
                          return (
                            <tr key={f.id} className="border-t border-borde/60">
                              <td className="px-4 py-1.5">
                                <span className="inline-flex items-center gap-2">
                                  {tk && <Logo ticker={tk} color={cat?.color} tam={22} />}
                                  <input value={f.ticker} onChange={(e) => cambiar({ ticker: e.target.value.toUpperCase() })} onBlur={() => tk && void pedirPrecios([tk])}
                                    list="catalogo-tickers" className={`${campo} w-28 uppercase`} />
                                </span>
                              </td>
                              <td className="px-2">
                                {cat?.auto ? <span className="text-tenue italic">{cat.nombre}</span> : tk ? (
                                  <select value={f.categoriaId ?? ""} onChange={(e) => cambiar({ categoriaId: Number(e.target.value) || null })} className={`${campo} ${f.categoriaId ? "" : "border-aviso"}`}>
                                    <option value="">Elegí (ticker nuevo)</option>
                                    {p.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                  </select>
                                ) : null}
                              </td>
                              <td className="px-2 text-right"><input value={f.cantidad} onChange={(e) => cambiar({ cantidad: e.target.value })} inputMode="decimal" className={`${campo} w-20 text-right`} /></td>
                              <td className="px-2 text-right">{celdaPrecio(f.ticker)}</td>
                              <td className="px-2 text-right num">{monto ? pesos(monto) : "—"}</td>
                              <td className="px-2 text-right">{monto ? <Monto usd={usd} /> : "—"}</td>
                              <td className="px-2 text-right text-tenue">{montoNivel && monto ? <Pct valor={monto / montoNivel} /> : "—"}</td>
                              <td className="px-2 text-right text-tenue">{ideal ? <Pct valor={ideal} /> : "—"}</td>
                              <td className="px-2 text-right">{comprado ? <Monto usd={comprado} /> : "—"}</td>
                              <td className={`px-2 text-center text-xs font-semibold ${est === "✓ hecho" ? "text-sube" : est === "parcial" ? "text-aviso" : "text-tenue"}`}>{est}</td>
                              <td className="px-2"><button onClick={() => setFilas({ ...filas, [n.nivel]: fs.filter((x) => x.id !== f.id) })} className="text-tenue hover:text-baja" aria-label="Quitar">×</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <button onClick={() => setFilas({ ...filas, [n.nivel]: [...fs, { id: nuevoId(), ticker: "", cantidad: "", categoriaId: null }] })}
                  className="px-4 py-2.5 text-sm text-marino hover:underline">+ Agregar ticker</button>
              </section>
            );
          })}

          <section className="rounded-xl bg-white border border-borde">
            <div className="flex items-center justify-between px-4 py-3 border-b border-borde">
              <p className="font-bold">Ventas planificadas</p>
              <button onClick={() => setVentas([...ventas, { id: nuevoId(), ticker: "", cantidad: "" }])} className="text-sm text-marino hover:underline">+ Agregar venta</button>
            </div>
            {ventas.length === 0 ? <p className="px-4 py-3 text-sm text-tenue">Sin ventas. Elegí el ticker y cuántos nominales, y te calcula cuánto sale con el último precio.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-tenue"><th className="text-left px-4 py-2">Ticker</th><th className="text-right px-2">Nominales a vender</th><th className="text-right px-2">Tenés hoy</th><th className="text-right px-2">Precio</th><th className="text-right px-2">Monto</th><th className="text-right px-2">USD</th><th /></tr></thead>
                  <tbody>
                    {ventas.map((v) => {
                      const t = up(v.ticker);
                      const pos = posDe.get(t);
                      const monto = montoVenta(v);
                      const cambiar = (c: Partial<Venta>) => setVentas(ventas.map((x) => (x.id === v.id ? { ...x, ...c } : x)));
                      return (
                        <tr key={v.id} className="border-t border-borde/60">
                          <td className="px-4 py-1.5">
                            <select value={t} onChange={(e) => { cambiar({ ticker: e.target.value }); void pedirPrecios([e.target.value]); }} className={campo}>
                              <option value="">Elegí…</option>
                              {p.posiciones.map((x) => <option key={x.ticker} value={x.ticker}>{x.ticker}</option>)}
                            </select>
                          </td>
                          <td className="px-2 text-right">
                            <input value={v.cantidad} onChange={(e) => cambiar({ cantidad: e.target.value })} inputMode="decimal" className={`${campo} w-24 text-right ${pos && num(v.cantidad) > pos.cantidad ? "border-baja" : ""}`} />
                            {pos && <button onClick={() => cambiar({ cantidad: String(pos.cantidad) })} className="ml-1 text-xs text-marino underline">todo</button>}
                          </td>
                          <td className="px-2 text-right num">{pos ? fmtCant(pos.cantidad) : "—"}</td>
                          <td className="px-2 text-right">{celdaPrecio(v.ticker)}</td>
                          <td className="px-2 text-right num">{monto ? pesos(monto) : "—"}</td>
                          <td className="px-2 text-right">{monto ? <Monto usd={monto / tcN} /> : "—"}</td>
                          <td className="px-2"><button onClick={() => setVentas(ventas.filter((x) => x.id !== v.id))} className="text-tenue hover:text-baja" aria-label="Quitar">×</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="px-4 py-2 text-xs text-tenue">Lo que se vende ({pesos(proy.totalVentas * tcN)}) queda como efectivo: no suma al capital del mes.</p>
              </div>
            )}
          </section>

          <datalist id="catalogo-tickers">{p.tickers.map((t) => <option key={t.ticker} value={t.ticker}>{t.nombre}</option>)}</datalist>
          <p className="text-xs text-tenue">El monto sale de nominales × último precio de IOL. “Comprado” se completa solo con las compras del mes que trae el sync (o que cargás en Movimientos).</p>
        </>
      ) : (
        <>
          <section className="rounded-xl bg-white border border-borde p-4">
            <p className="font-bold mb-2">Supuestos</p>
            <label className="flex flex-wrap items-center gap-2 text-sm">Tipo de cambio estimado (ARS por USD)
              <input value={tc} onChange={(e) => setTc(e.target.value)} inputMode="decimal" className={`${campo} w-28`} />
              <span className="text-tenue">(MEP de hoy: {p.mep.toLocaleString("es-AR")})</span>
            </label>
          </section>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white border-2 border-marino/30 p-4"><p className="text-sm text-tenue">Cartera proyectada</p><p className="text-2xl font-black text-marino"><Monto usd={proy.totalProy} /></p></div>
            <div className="rounded-xl bg-white border border-borde p-4"><p className="text-sm text-tenue">Cartera hoy</p><p className="text-2xl font-bold"><Monto usd={proy.totalActual} /></p></div>
            <div className="rounded-xl bg-white border border-borde p-4"><p className="text-sm text-tenue">Diferencia</p><p className="text-2xl font-bold"><Monto usd={proy.totalProy - proy.totalActual} signo /></p>
              <p className="text-xs text-tenue">{origen === "Aporte nuevo" ? "el aporte nuevo" : "sale del efectivo: no suma"}</p></div>
          </div>
          {proy.efeProy < -0.01 && (
            <p className="rounded-lg bg-red-50 text-baja px-4 py-2 text-sm font-semibold">
              ⚠ El plan usa más efectivo del que hay: faltan <Monto usd={-proy.efeProy} />.
            </p>
          )}

          <section className="rounded-xl bg-white border border-borde p-4">
            <p className="font-bold mb-3">Distribución proyectada por categoría</p>
            <Dona porciones={porciones} alto={220} />
          </section>

          <section className="rounded-xl bg-white border border-borde overflow-x-auto">
            <div className="flex flex-wrap items-baseline gap-2 px-4 py-3 border-b border-borde">
              <p className="font-bold">Posiciones proyectadas</p>
              {p.ideal
                ? <p className="text-xs text-tenue">contra la cartera ideal vigente desde {fecha(p.ideal.vigenteDesde)} · desvío = % real − % ideal</p>
                : <button onClick={() => setTab("ideal")} className="text-xs text-marino underline">Armá la cartera ideal para ver los desvíos</button>}
            </div>
            <TablaProyectada grupos={grupos} totalActual={proy.totalActual} totalProy={proy.totalProy} conIdeal={!!p.ideal} />
          </section>
        </>
      )}
    </div>
  );
}

/** Filas del editor a partir de un plan guardado. Los planes viejos (por %) se pasan a nominales con el precio de hoy. */
function desdePlan(pl: Plan | null, precioArs: (t: string) => number | null): Record<Nivel, Fila[]> {
  const r: Record<Nivel, Fila[]> = { Bajo: [], Medio: [], Alto: [] };
  for (const i of pl?.items ?? []) {
    let cantidad = i.cantidad;
    if (cantidad == null && i.pct != null && pl) {
      const pr = precioArs(i.ticker);
      const monto = pl.capital * (pl.pctNivel[i.nivel] / 100) * (i.pct / 100);
      cantidad = pr ? Math.floor(monto / pr) : null;
    }
    r[i.nivel].push({ id: nuevoId(), ticker: i.ticker, cantidad: cantidad == null ? "" : String(+cantidad.toFixed(6)), categoriaId: i.categoriaId });
  }
  return r;
}

function Sugerencia(p: {
  hayIdeal: boolean; sugerencia: ReturnType<typeof sugerirCompras> | null; info: Map<string, TickerInfo>; tcN: number;
  nivelDe: (t: string) => { nivel: Nivel } | undefined; filas: Record<Nivel, Fila[]>;
  pesoIdeal: (t: string) => number; pesoHoy: (t: string) => number; pesoDespues: (t: string, usd: number) => number;
  agregar: (n: Nivel, t: string, cantidad: number) => void; usarTodo: (n: Nivel) => void; irAIdeal: () => void;
}) {
  const [abierta, setAbierta] = useState(true);
  if (!p.hayIdeal) {
    return (
      <section className="rounded-xl border border-dashed border-borde bg-white px-4 py-3 text-sm text-tenue">
        Sin cartera ideal para este mes. <button onClick={p.irAIdeal} className="text-marino underline">Armala</button> y te sugiere qué comprar (en nominales) para acercarte.
      </section>
    );
  }
  if (!p.sugerencia) return <section className="rounded-xl border border-dashed border-borde bg-white px-4 py-3 text-sm text-tenue">Poné el capital del mes y te sugiero qué comprar según la cartera ideal.</section>;
  const { compras, sobranteUsd } = p.sugerencia;
  return (
    <section className="rounded-xl bg-white border border-marino/30">
      <button onClick={() => setAbierta(!abierta)} className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left">
        <span className="font-bold">{abierta ? "▾" : "▸"} Sugerencia según la cartera ideal</span>
        <span className="text-xs text-tenue">solo compras · nominales enteros · con el último precio</span>
        <span className="ml-auto text-sm text-tenue">sin asignar: <b>{pesos(sobranteUsd * p.tcN)}</b></span>
      </button>
      {abierta && (compras.length === 0 ? <p className="px-4 pb-3 text-sm text-tenue">No hay nada que comprar: la cartera ya está en la ideal (o faltan precios).</p> : (
        <div className="overflow-x-auto border-t border-borde">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-tenue">
                <th className="text-left px-4 py-2">Ticker</th><th className="text-right px-2">% hoy</th>
                <th className="text-right px-2" title="Con el aporte del mes la cartera crece: el % de hoy baja aunque no se venda nada">% con la sugerencia</th><th className="text-right px-2">% ideal</th>
                <th className="text-right px-2">Nominales</th><th className="text-right px-2">Monto</th><th className="text-left px-2">Agregar al plan</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => {
                const t = p.info.get(c.ticker);
                const en = p.nivelDe(c.ticker);
                const yaCant = en ? p.filas[en.nivel].find((f) => up(f.ticker) === c.ticker)?.cantidad : null;
                return (
                  <tr key={c.ticker} className="border-t border-borde/60">
                    <td className="px-4 py-1.5"><span className="inline-flex items-center gap-2"><Logo ticker={c.ticker} color={t?.color} tam={20} /><b>{c.ticker}</b></span></td>
                    <td className="px-2 text-right text-tenue"><Pct valor={p.pesoHoy(c.ticker)} /></td>
                    <td className="px-2 text-right"><Pct valor={p.pesoDespues(c.ticker, c.montoUsd)} /></td>
                    <td className="px-2 text-right"><Pct valor={p.pesoIdeal(c.ticker)} /></td>
                    <td className="px-2 text-right num font-semibold">{fmtCant(c.cantidad)}</td>
                    <td className="px-2 text-right num">{pesos(c.montoUsd * p.tcN)}</td>
                    <td className="px-2">
                      {en && num(yaCant ?? "") === c.cantidad ? <span className="text-xs text-sube">✓ en el plan ({en.nivel})</span> : (
                        <span className="inline-flex gap-1">
                          {NIVELES.filter((n) => !en || n.nivel === en.nivel).map((n) => (
                            <button key={n.nivel} onClick={() => p.agregar(n.nivel, c.ticker, c.cantidad)} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: n.fondo, color: n.color }}>
                              {en ? `actualizar en ${n.nivel}` : `+ ${n.nivel}`}
                            </button>
                          ))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs text-tenue border-t border-borde">
            Usar toda la sugerencia (lo que ya está en un nivel se actualiza ahí; lo nuevo va a):
            {NIVELES.map((n) => (
              <button key={n.nivel} onClick={() => p.usarTodo(n.nivel)} className="rounded-full px-2 py-0.5 font-semibold" style={{ background: n.fondo, color: n.color }}>{n.nivel}</button>
            ))}
          </p>
        </div>
      ))}
    </section>
  );
}

type ItemProy = { ticker: string; categoria: string; color: string; actual: number; proyectado: number; ideal: number | null; efectivo?: boolean };
type Grupo = { categoria: string; color: string; actual: number; proyectado: number; ideal: number | null; items: ItemProy[] };

function agrupar(lista: ItemProy[], categorias: Categoria[], idealCat: Map<number, number> | null): Grupo[] {
  const m = new Map<string, Grupo>();
  const idDe = new Map(categorias.map((c) => [c.nombre, c.id]));
  const nuevo = (categoria: string, color: string): Grupo => ({
    categoria, color, actual: 0, proyectado: 0, items: [],
    ideal: idealCat ? idealCat.get(idDe.get(categoria) ?? -1) ?? 0 : null,
  });
  for (const x of lista) {
    const g = m.get(x.categoria) ?? nuevo(x.categoria, x.color);
    g.actual += x.actual; g.proyectado += x.proyectado; g.items.push(x);
    m.set(x.categoria, g);
  }
  // categorías que la ideal pide y todavía no tienen nada
  for (const [id, pct] of idealCat ?? []) {
    const c = categorias.find((x) => x.id === id);
    if (c && pct > 0 && !m.has(c.nombre)) m.set(c.nombre, nuevo(c.nombre, c.color));
  }
  return [...m.values()]
    .map((g) => ({ ...g, items: g.items.filter((x) => x.actual > 0.005 || x.proyectado > 0.005 || (x.ideal ?? 0) > 0).sort((a, b) => b.proyectado - a.proyectado) }))
    .filter((g) => g.items.length > 0 || (g.ideal ?? 0) > 0)
    .sort((a, b) => b.proyectado - a.proyectado || (b.ideal ?? 0) - (a.ideal ?? 0));
}

function TablaProyectada({ grupos, totalActual, totalProy, conIdeal }: { grupos: Grupo[]; totalActual: number; totalProy: number; conIdeal: boolean }) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const pa = (v: number) => (totalActual ? v / totalActual : 0);
  const pp = (v: number) => (totalProy ? v / totalProy : 0);
  const desvio = (v: number | null, fuerte: boolean) => v == null ? <span className="text-tenue">—</span> : (
    <span className={`num ${Math.abs(v) > UMBRAL_DESVIO && fuerte ? "text-aviso font-bold" : ""}`}>{fmtPct(v, true)}</span>
  );
  const celdas = (actual: number, proyectado: number, ideal: number | null, fuerte = false) => {
    const dHoy = ideal == null ? null : pa(actual) - ideal;
    const dProy = ideal == null ? null : pp(proyectado) - ideal;
    const mejora = dHoy != null && dProy != null && Math.abs(dProy) < Math.abs(dHoy) - 0.0005;
    const empeora = dHoy != null && dProy != null && Math.abs(dProy) > Math.abs(dHoy) + 0.0005;
    return (
      <>
        <td className={`px-2 py-2 text-right ${fuerte ? "font-semibold" : "text-tenue"}`}><Monto usd={actual} /></td>
        <td className={`px-2 text-right ${fuerte ? "font-semibold" : ""}`}><Monto usd={proyectado} /></td>
        <td className="px-2 text-right">{Math.abs(proyectado - actual) > 0.005 ? <Monto usd={proyectado - actual} signo /> : "—"}</td>
        <td className="px-2 text-right text-tenue"><Pct valor={pa(actual)} /></td>
        <td className="px-2 text-right"><Pct valor={pp(proyectado)} /></td>
        {conIdeal && (
          <>
            <td className="px-2 text-right font-semibold border-l border-borde">{ideal == null ? <span className="text-tenue font-normal">—</span> : <Pct valor={ideal} />}</td>
            <td className="px-2 text-right">{desvio(dHoy, fuerte)}</td>
            <td className="px-2 text-right whitespace-nowrap">
              {desvio(dProy, fuerte)}
              {mejora && <span className="text-sube ml-1" title="El plan te acerca a la ideal">▼</span>}
              {empeora && <span className="text-baja ml-1" title="El plan te aleja de la ideal">▲</span>}
            </td>
            <td className="px-2 pr-4 text-right">{ideal == null ? "—" : Math.abs(ideal * totalProy - proyectado) > 0.5 ? <Monto usd={ideal * totalProy - proyectado} signo /> : "✓"}</td>
          </>
        )}
      </>
    );
  };
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-tenue">
          <th className="text-left px-4 py-2">Ticker</th><th className="text-right px-2">USD hoy</th><th className="text-right px-2">USD proyectado</th>
          <th className="text-right px-2">Diferencia</th><th className="text-right px-2">% hoy</th><th className="text-right px-2">% proyectado</th>
          {conIdeal && <>
            <th className="text-right px-2 border-l border-borde">% ideal</th><th className="text-right px-2">Desvío hoy</th>
            <th className="text-right px-2">Desvío proyectado</th><th className="text-right px-2 pr-4" title="USD que faltan (+) o sobran (−) después del plan para llegar a la ideal">Para la ideal</th>
          </>}
        </tr>
      </thead>
      <tbody>
        {grupos.map((g) => {
          const abierto = abiertos.has(g.categoria);
          return [
            <tr key={g.categoria} className="border-t border-borde cursor-pointer" style={{ background: `${g.color}12` }}
              onClick={() => { const s = new Set(abiertos); if (abierto) s.delete(g.categoria); else s.add(g.categoria); setAbiertos(s); }}>
              <td className="px-4 py-2 font-semibold" style={{ color: g.color }}>{abierto ? "▾" : "▸"} {g.categoria} <span className="text-tenue font-normal text-xs">({g.items.length})</span></td>
              {celdas(g.actual, g.proyectado, g.ideal, true)}
            </tr>,
            ...(abierto ? g.items.map((x) => (
              <tr key={x.ticker} className="border-t border-borde/50">
                <td className="px-4 py-1.5 pl-8">
                  {x.efectivo ? <span className="font-semibold">Efectivo</span>
                    : <span className="inline-flex items-center gap-2"><Logo ticker={x.ticker} color={x.color} tam={20} /><b>{x.ticker}</b></span>}
                </td>
                {celdas(x.actual, x.proyectado, x.efectivo ? null : x.ideal ?? (conIdeal ? 0 : null))}
              </tr>
            )) : []),
          ];
        })}
        <tr className="border-t-2 border-borde font-bold">
          <td className="px-4 py-2">Total</td>
          {celdas(totalActual, totalProy, null, true)}
        </tr>
      </tbody>
    </table>
  );
}
