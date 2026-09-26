"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dona, type Porcion } from "@/components/graficos";
import { Logo } from "@/components/logo";
import { Monto, Pct } from "@/components/preferencias";
import { fmtCant } from "@/lib/formato";
import { borrarPlan, guardarPlan, type Estado, type Plan } from "./actions";

type Nivel = "Bajo" | "Medio" | "Alto";
type TickerInfo = { ticker: string; nombre: string; categoria: string | null; categoriaId: number | null; color: string | null; precioUsd: number | null };
type Pos = { ticker: string; nombre: string; categoria: string; color: string; usd: number; cantidad: number; precio: number };
type Fila = { id: number; ticker: string; pct: string; categoriaId: number | null };
type Venta = { id: number; ticker: string; cantidad: string };

const NIVELES: { nivel: Nivel; titulo: string; color: string; fondo: string }[] = [
  { nivel: "Bajo", titulo: "RIESGO BAJO", color: "#15803D", fondo: "#dcfce7" },
  { nivel: "Medio", titulo: "RIESGO MEDIO", color: "#B45309", fondo: "#fef3c7" },
  { nivel: "Alto", titulo: "RIESGO ALTO", color: "#B91C1C", fondo: "#fee2e2" },
];
let proximoId = 1;
const nuevoId = () => proximoId++;
const num = (s: string) => {
  let t = s.trim();
  if (!t) return 0;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};
const pesos = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;

export function EditorPlan(p: {
  hermana: { id: number; nombre: string; color: string }; todas: number[]; mes: string;
  plan: Plan | null; anterior: Plan | null; mep: number;
  tickers: TickerInfo[]; categorias: { id: number; nombre: string; color: string }[];
  posiciones: Pos[]; efectivoUsd: number; ejecutado: Record<string, number>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"plan" | "tenencias">("plan");
  const [capital, setCapital] = useState(p.plan ? String(p.plan.capital) : "");
  const [tc, setTc] = useState(String(Math.round((p.plan?.tc || p.mep) * 100) / 100));
  const [origen, setOrigen] = useState<Plan["origen"]>(p.plan?.origen ?? "Aporte nuevo");
  const [pctNivel, setPctNivel] = useState<Record<Nivel, string>>({
    Bajo: String(p.plan?.pctNivel.Bajo ?? 0), Medio: String(p.plan?.pctNivel.Medio ?? 0), Alto: String(p.plan?.pctNivel.Alto ?? 0),
  });
  const [filas, setFilas] = useState<Record<Nivel, Fila[]>>(() => desdePlan(p.plan));
  const [ventas, setVentas] = useState<Venta[]>(() => (p.plan?.ventas ?? []).map((v) => ({ id: nuevoId(), ticker: v.ticker, cantidad: String(v.cantidad) })));
  const [estado, setEstado] = useState<Estado>({});
  const [guardando, start] = useTransition();

  const info = useMemo(() => new Map(p.tickers.map((t) => [t.ticker, t])), [p.tickers]);
  const catPorId = useMemo(() => new Map(p.categorias.map((c) => [c.id, c])), [p.categorias]);
  const posDe = useMemo(() => new Map(p.posiciones.map((x) => [x.ticker, x])), [p.posiciones]);

  const cap = num(capital);
  const tcN = num(tc) || p.mep;
  const capUsd = cap / tcN;
  const categoriaDe = (f: { ticker: string; categoriaId: number | null }) => {
    const t = info.get(f.ticker.trim().toUpperCase());
    if (t?.categoria) return { nombre: t.categoria, color: t.color ?? "#9CA3AF", auto: true };
    const c = f.categoriaId ? catPorId.get(f.categoriaId) : null;
    return c ? { nombre: c.nombre, color: c.color, auto: false } : null;
  };
  const montoArs = (n: Nivel, f: Fila) => cap * (num(pctNivel[n]) / 100) * (num(f.pct) / 100);
  const sumaNiveles = NIVELES.reduce((a, n) => a + num(pctNivel[n.nivel]), 0);

  // ---- proyección ("Tenencias estimadas")
  const proy = useMemo(() => {
    const compras = new Map<string, number>();
    for (const n of NIVELES) for (const f of filas[n.nivel]) {
      const t = f.ticker.trim().toUpperCase();
      if (t) compras.set(t, (compras.get(t) ?? 0) + montoArs(n.nivel, f) / tcN);
    }
    const vendido = new Map<string, number>();
    for (const v of ventas) {
      const t = v.ticker.trim().toUpperCase();
      const precio = posDe.get(t)?.precio ?? info.get(t)?.precioUsd ?? 0;
      if (t) vendido.set(t, (vendido.get(t) ?? 0) + num(v.cantidad) * precio);
    }
    const tickers = new Set([...posDe.keys(), ...compras.keys(), ...vendido.keys()]);
    const lista = [...tickers].map((t) => {
      const actual = posDe.get(t)?.usd ?? 0;
      const c = categoriaDe({ ticker: t, categoriaId: [...NIVELES.flatMap((n) => filas[n.nivel])].find((f) => f.ticker.trim().toUpperCase() === t)?.categoriaId ?? null });
      return {
        ticker: t, nombre: posDe.get(t)?.nombre ?? info.get(t)?.nombre ?? t,
        categoria: posDe.get(t)?.categoria ?? c?.nombre ?? "Otros", color: posDe.get(t)?.color ?? c?.color ?? "#9CA3AF",
        actual, proyectado: Math.max(0, actual + (compras.get(t) ?? 0) - (vendido.get(t) ?? 0)),
      };
    });
    const totalCompras = [...compras.values()].reduce((a, b) => a + b, 0);
    const totalVentas = [...vendido.values()].reduce((a, b) => a + b, 0);
    const efeProy = p.efectivoUsd + (origen === "Aporte nuevo" ? capUsd : 0) - totalCompras + totalVentas;
    const totalActual = lista.reduce((a, x) => a + x.actual, 0) + p.efectivoUsd;
    const totalProy = lista.reduce((a, x) => a + x.proyectado, 0) + Math.max(0, efeProy);
    return { lista, efeProy, totalActual, totalProy, totalCompras };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, ventas, pctNivel, capital, tc, origen, p.efectivoUsd, posDe, info]);

  const planActual = (): Plan => ({
    mes: p.mes, capital: cap, tc: tcN, origen,
    pctNivel: { Bajo: num(pctNivel.Bajo), Medio: num(pctNivel.Medio), Alto: num(pctNivel.Alto) },
    items: NIVELES.flatMap((n) => filas[n.nivel].filter((f) => f.ticker.trim()).map((f) => ({ nivel: n.nivel, ticker: f.ticker, pct: num(f.pct), categoriaId: f.categoriaId }))),
    ventas: ventas.filter((v) => v.ticker.trim()).map((v) => ({ ticker: v.ticker, cantidad: num(v.cantidad) })),
  });
  const guardar = (hermanas: number[]) => start(async () => {
    const r = await guardarPlan(hermanas, planActual());
    setEstado(r);
    if (r.ok) router.refresh();
  });
  const traer = (pl: Plan) => {
    setCapital(String(pl.capital)); setOrigen(pl.origen);
    setPctNivel({ Bajo: String(pl.pctNivel.Bajo), Medio: String(pl.pctNivel.Medio), Alto: String(pl.pctNivel.Alto) });
    setFilas(desdePlan(pl));
    setVentas(pl.ventas.map((v) => ({ id: nuevoId(), ticker: v.ticker, cantidad: String(v.cantidad) })));
  };

  const campo = "rounded-md border border-borde bg-completar px-2 py-1.5 text-sm";
  const grupos = agrupar(proy.lista);
  const porciones: Porcion[] = grupos.map((g) => ({
    nombre: g.categoria, color: g.color,
    usd: g.proyectado + (g.categoria === "Disponibilidades" ? Math.max(0, proy.efeProy) : 0),
    pct: null,
    hijos: [
      ...(g.categoria === "Disponibilidades" && proy.efeProy > 0 ? [{ nombre: "Efectivo", usd: proy.efeProy }] : []),
      ...g.items.filter((x) => x.proyectado > 0).map((x) => ({ nombre: x.ticker, usd: x.proyectado, logo: true })),
    ],
  }));
  if (!grupos.some((g) => g.categoria === "Disponibilidades") && proy.efeProy > 0) {
    porciones.push({ nombre: "Disponibilidades", color: "#64748B", usd: proy.efeProy, pct: null, hijos: [{ nombre: "Efectivo", usd: proy.efeProy }] });
  }
  const totalPorciones = porciones.reduce((a, x) => a + x.usd, 0);
  porciones.forEach((x) => { x.pct = totalPorciones ? x.usd / totalPorciones : null; });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-borde bg-white p-1 text-sm">
          {([["plan", "Planificación"], ["tenencias", "Tenencias estimadas"]] as const).map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-md ${tab === k ? "bg-marino text-white font-semibold" : ""}`}>{t}</button>
          ))}
        </div>
        {!p.plan && p.anterior && (
          <button onClick={() => traer(p.anterior!)} className="text-sm text-marino underline">Traer el plan del mes anterior</button>
        )}
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
      </div>

      {tab === "plan" ? (
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
            <p className={`text-sm ml-auto font-semibold ${Math.abs(sumaNiveles - 100) < 0.01 ? "text-sube" : "text-baja"}`}>
              Niveles: {sumaNiveles}% {Math.abs(sumaNiveles - 100) < 0.01 ? "✓" : "(tiene que dar 100%)"}
            </p>
          </section>

          {NIVELES.map((n) => {
            const fs = filas[n.nivel];
            const sumaNivel = fs.reduce((a, f) => a + num(f.pct), 0);
            const montoNivel = cap * (num(pctNivel[n.nivel]) / 100);
            return (
              <section key={n.nivel} className="rounded-xl bg-white border border-borde overflow-hidden" style={{ borderLeft: `4px solid ${n.color}` }}>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-borde">
                  <span className="rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: n.fondo, color: n.color }}>{n.titulo}</span>
                  {fs.length > 0 && Math.abs(sumaNivel - 100) > 0.01 && <span className="text-xs text-baja">Los % del nivel suman {sumaNivel}%</span>}
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
                          <th className="text-right px-2">% del nivel</th><th className="text-right px-2">Monto</th>
                          <th className="text-right px-2">USD</th><th className="text-right px-2">Comprado</th><th className="px-2">Estado</th><th />
                        </tr>
                      </thead>
                      <tbody>
                        {fs.map((f) => {
                          const cat = categoriaDe(f);
                          const tk = f.ticker.trim().toUpperCase();
                          const usd = montoArs(n.nivel, f) / tcN;
                          const comprado = p.ejecutado[tk] ?? 0;
                          const est = !tk ? "" : comprado >= usd * 0.95 && usd > 0 ? "✓ hecho" : comprado > 0 ? "parcial" : "pendiente";
                          const cambiar = (c: Partial<Fila>) => setFilas({ ...filas, [n.nivel]: fs.map((x) => (x.id === f.id ? { ...x, ...c } : x)) });
                          return (
                            <tr key={f.id} className="border-t border-borde/60">
                              <td className="px-4 py-1.5">
                                <span className="inline-flex items-center gap-2">
                                  {tk && <Logo ticker={tk} color={cat?.color} tam={22} />}
                                  <input value={f.ticker} onChange={(e) => cambiar({ ticker: e.target.value.toUpperCase() })} list="catalogo-tickers" className={`${campo} w-28 uppercase`} />
                                </span>
                              </td>
                              <td className="px-2">
                                {cat?.auto ? <span className="text-tenue italic">Auto: {cat.nombre}</span> : tk ? (
                                  <select value={f.categoriaId ?? ""} onChange={(e) => cambiar({ categoriaId: Number(e.target.value) || null })} className={`${campo} ${f.categoriaId ? "" : "border-aviso"}`}>
                                    <option value="">Elegí (ticker nuevo)</option>
                                    {p.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                  </select>
                                ) : null}
                              </td>
                              <td className="px-2 text-right"><input value={f.pct} onChange={(e) => cambiar({ pct: e.target.value })} inputMode="decimal" className={`${campo} w-16 text-right`} /> %</td>
                              <td className="px-2 text-right num">{pesos(montoArs(n.nivel, f))}</td>
                              <td className="px-2 text-right"><Monto usd={usd} /></td>
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
                <button onClick={() => setFilas({ ...filas, [n.nivel]: [...fs, { id: nuevoId(), ticker: "", pct: "", categoriaId: null }] })}
                  className="px-4 py-2.5 text-sm text-marino hover:underline">+ Agregar ticker</button>
              </section>
            );
          })}
          <datalist id="catalogo-tickers">{p.tickers.map((t) => <option key={t.ticker} value={t.ticker}>{t.nombre}</option>)}</datalist>
          <p className="text-xs text-tenue">“Comprado” se completa solo con las compras del mes que trae el sync (o que cargás en Movimientos).</p>
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

          <section className="rounded-xl bg-white border border-borde">
            <div className="flex items-center justify-between px-4 py-3 border-b border-borde">
              <p className="font-bold">Ventas planificadas</p>
              <button onClick={() => setVentas([...ventas, { id: nuevoId(), ticker: "", cantidad: "" }])} className="text-sm text-marino hover:underline">+ Agregar venta</button>
            </div>
            {ventas.length === 0 ? <p className="px-4 py-3 text-sm text-tenue">Sin ventas. Agregá lo que pensás vender para verlo en la proyección.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-tenue"><th className="text-left px-4 py-2">Ticker</th><th className="text-right px-2">Cantidad a vender</th><th className="text-right px-2">Tenés hoy</th><th className="text-right px-2">Monto estimado</th><th /></tr></thead>
                <tbody>
                  {ventas.map((v) => {
                    const t = v.ticker.trim().toUpperCase();
                    const pos = posDe.get(t);
                    const cambiar = (c: Partial<Venta>) => setVentas(ventas.map((x) => (x.id === v.id ? { ...x, ...c } : x)));
                    return (
                      <tr key={v.id} className="border-t border-borde/60">
                        <td className="px-4 py-1.5">
                          <select value={t} onChange={(e) => cambiar({ ticker: e.target.value })} className={campo}>
                            <option value="">Elegí…</option>
                            {p.posiciones.map((x) => <option key={x.ticker} value={x.ticker}>{x.ticker}</option>)}
                          </select>
                        </td>
                        <td className="px-2 text-right"><input value={v.cantidad} onChange={(e) => cambiar({ cantidad: e.target.value })} inputMode="decimal" className={`${campo} w-24 text-right`} /></td>
                        <td className="px-2 text-right num">{pos ? fmtCant(pos.cantidad) : "—"}</td>
                        <td className="px-2 text-right"><Monto usd={num(v.cantidad) * (pos?.precio ?? 0)} /></td>
                        <td className="px-2"><button onClick={() => setVentas(ventas.filter((x) => x.id !== v.id))} className="text-tenue hover:text-baja" aria-label="Quitar">×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
            <p className="font-bold px-4 py-3 border-b border-borde">Posiciones proyectadas</p>
            <TablaProyectada grupos={grupos} totalActual={proy.totalActual} totalProy={proy.totalProy} efectivo={p.efectivoUsd} efeProy={proy.efeProy} />
          </section>
        </>
      )}
    </div>
  );
}

function desdePlan(pl: Plan | null): Record<Nivel, Fila[]> {
  const r: Record<Nivel, Fila[]> = { Bajo: [], Medio: [], Alto: [] };
  for (const i of pl?.items ?? []) r[i.nivel].push({ id: nuevoId(), ticker: i.ticker, pct: String(+i.pct.toFixed(4)), categoriaId: i.categoriaId });
  return r;
}

type ItemProy = { ticker: string; nombre: string; categoria: string; color: string; actual: number; proyectado: number };
function agrupar(lista: ItemProy[]) {
  const m = new Map<string, { categoria: string; color: string; actual: number; proyectado: number; items: ItemProy[] }>();
  for (const x of lista) {
    const g = m.get(x.categoria) ?? { categoria: x.categoria, color: x.color, actual: 0, proyectado: 0, items: [] };
    g.actual += x.actual; g.proyectado += x.proyectado; g.items.push(x);
    m.set(x.categoria, g);
  }
  return [...m.values()].map((g) => ({ ...g, items: g.items.sort((a, b) => b.proyectado - a.proyectado) })).sort((a, b) => b.proyectado - a.proyectado);
}

function TablaProyectada({ grupos, totalActual, totalProy, efectivo, efeProy }: {
  grupos: ReturnType<typeof agrupar>; totalActual: number; totalProy: number; efectivo: number; efeProy: number;
}) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const pa = (v: number) => (totalActual ? v / totalActual : null);
  const pp = (v: number) => (totalProy ? v / totalProy : null);
  const celdas = (actual: number, proyectado: number, fuerte = false) => (
    <>
      <td className={`px-2 py-2 text-right ${fuerte ? "font-semibold" : "text-tenue"}`}><Monto usd={actual} /></td>
      <td className={`px-2 text-right ${fuerte ? "font-semibold" : ""}`}><Monto usd={proyectado} /></td>
      <td className="px-2 text-right">{Math.abs(proyectado - actual) > 0.005 ? <Monto usd={proyectado - actual} signo /> : "—"}</td>
      <td className="px-2 text-right text-tenue"><Pct valor={pa(actual)} /></td>
      <td className="px-2 text-right"><Pct valor={pp(proyectado)} /></td>
      <td className="px-2 text-right">{Math.abs((pp(proyectado) ?? 0) - (pa(actual) ?? 0)) > 0.0005 ? <Pct valor={(pp(proyectado) ?? 0) - (pa(actual) ?? 0)} signo /> : "—"}</td>
    </>
  );
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-tenue">
          <th className="text-left px-4 py-2">Ticker</th><th className="text-right px-2">USD hoy</th><th className="text-right px-2">USD proyectado</th>
          <th className="text-right px-2">Diferencia</th><th className="text-right px-2">% hoy</th><th className="text-right px-2">% proyectado</th><th className="text-right px-2 pr-4">Cambio de peso</th>
        </tr>
      </thead>
      <tbody>
        {grupos.map((g) => {
          const abierto = abiertos.has(g.categoria);
          return [
            <tr key={g.categoria} className="border-t border-borde cursor-pointer" style={{ background: `${g.color}12` }}
              onClick={() => { const s = new Set(abiertos); if (abierto) s.delete(g.categoria); else s.add(g.categoria); setAbiertos(s); }}>
              <td className="px-4 py-2 font-semibold" style={{ color: g.color }}>{abierto ? "▾" : "▸"} {g.categoria} <span className="text-tenue font-normal text-xs">({g.items.length})</span></td>
              {celdas(g.actual, g.proyectado, true)}
            </tr>,
            ...(abierto ? g.items.map((x) => (
              <tr key={x.ticker} className="border-t border-borde/50">
                <td className="px-4 py-1.5 pl-8"><span className="inline-flex items-center gap-2"><Logo ticker={x.ticker} color={x.color} tam={20} /><b>{x.ticker}</b></span></td>
                {celdas(x.actual, x.proyectado)}
              </tr>
            )) : []),
          ];
        })}
        <tr className="border-t border-borde bg-fondo">
          <td className="px-4 py-2 font-semibold">Efectivo</td>
          {celdas(efectivo, Math.max(0, efeProy), true)}
        </tr>
        <tr className="border-t-2 border-borde font-bold">
          <td className="px-4 py-2">Total</td>
          {celdas(totalActual, totalProy, true)}
        </tr>
      </tbody>
    </table>
  );
}
