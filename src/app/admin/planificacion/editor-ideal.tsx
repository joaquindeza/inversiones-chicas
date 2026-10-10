"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Pct } from "@/components/preferencias";
import { fmtPct } from "@/lib/formato";
import { etiquetaPrecio } from "@/lib/mercado";
import { borrarIdeal, guardarIdeal, type Estado, type Ideal } from "./actions";
import { fecha, num, type Categoria, type TickerInfo } from "./comun";

type Item = { id: number; ticker: string; pct: string };
type Borrador = { pctCat: Record<number, string>; items: Record<number, Item[]> };

let proximoId = 1;
const nuevoId = () => proximoId++;
const redondo = (n: number) => String(+n.toFixed(4));

function borradorDe(v: Ideal | null, categorias: Categoria[]): Borrador {
  const pctCat: Record<number, string> = {};
  const items: Record<number, Item[]> = {};
  for (const c of categorias) {
    // sin ideal todavía: arranca con los objetivos viejos de Configuración
    const pct = v ? v.categorias.find((x) => x.categoriaId === c.id)?.pct : c.objetivoViejo;
    pctCat[c.id] = pct ? redondo(pct) : "";
    items[c.id] = (v?.items ?? []).filter((i) => i.categoriaId === c.id).map((i) => ({ id: nuevoId(), ticker: i.ticker, pct: redondo(i.pct) }));
  }
  return { pctCat, items };
}

export function EditorIdeal(p: {
  hermana: { id: number; nombre: string; color: string }; todas: number[]; hoy: string;
  ideales: Ideal[]; categorias: Categoria[]; tickers: TickerInfo[];
  posiciones: { ticker: string; categoria: string; usd: number }[]; efectivoUsd: number;
  precioArs: (t: string) => number | null; pedirPrecios: (t: string[]) => Promise<void>;
}) {
  const router = useRouter();
  const vigente = p.ideales.find((v) => v.vigenteDesde <= p.hoy) ?? p.ideales.at(-1) ?? null;
  const [base, setBase] = useState<string | null>(vigente?.vigenteDesde ?? null);
  const [b, setB] = useState<Borrador>(() => borradorDe(vigente, p.categorias));
  const [desde, setDesde] = useState(p.hoy);
  const [estado, setEstado] = useState<Estado>({});
  const [guardando, start] = useTransition();

  const info = useMemo(() => new Map(p.tickers.map((t) => [t.ticker, t])), [p.tickers]);
  const total = p.posiciones.reduce((a, x) => a + x.usd, 0) + p.efectivoUsd;
  const hoyCat = (nombre: string) => total
    ? (p.posiciones.filter((x) => x.categoria === nombre).reduce((a, x) => a + x.usd, 0) + (nombre === "Disponibilidades" ? p.efectivoUsd : 0)) / total : 0;
  const hoyTicker = (t: string) => (total ? (p.posiciones.find((x) => x.ticker === t)?.usd ?? 0) / total : 0);

  const sumaCat = p.categorias.reduce((a, c) => a + num(b.pctCat[c.id] ?? ""), 0);
  const cargar = (v: Ideal) => { setBase(v.vigenteDesde); setB(borradorDe(v, p.categorias)); setEstado({}); };
  const reemplaza = p.ideales.some((v) => v.vigenteDesde === desde);

  const idealActual = (): Ideal => ({
    vigenteDesde: desde,
    categorias: p.categorias.map((c) => ({ categoriaId: c.id, pct: num(b.pctCat[c.id] ?? "") })).filter((c) => c.pct > 0),
    items: p.categorias.flatMap((c) => b.items[c.id].filter((i) => i.ticker.trim()).map((i) => ({ ticker: i.ticker.trim().toUpperCase(), categoriaId: c.id, pct: num(i.pct) }))),
  });
  const guardar = (hermanas: number[]) => start(async () => {
    if (hermanas.length > 1 && !confirm(`Se guarda esta ideal (vigente desde ${fecha(desde)}) para las tres. ¿Seguimos?`)) return;
    const r = await guardarIdeal(hermanas, idealActual());
    setEstado(r);
    if (r.ok) { setBase(desde); router.refresh(); }
  });
  const borrar = (v: string) => start(async () => {
    if (!confirm(`¿Borrar la versión vigente desde ${fecha(v)}?`)) return;
    const r = await borrarIdeal(p.hermana.id, v);
    setEstado(r);
    router.refresh();
  });

  const campo = "rounded-md border border-borde bg-completar px-2 py-1.5 text-sm";
  const setItems = (cat: number, items: Item[]) => setB({ ...b, items: { ...b.items, [cat]: items } });

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white border border-borde p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-tenue">Versiones de {p.hermana.nombre}:</span>
          {p.ideales.length === 0 && <span className="text-tenue italic">ninguna todavía</span>}
          {p.ideales.map((v) => (
            <span key={v.vigenteDesde} className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 ${v.vigenteDesde === base ? "border-marino bg-marino/5 font-semibold" : "border-borde"}`}>
              <button onClick={() => cargar(v)}>desde {fecha(v.vigenteDesde)}{v === vigente ? " · vigente" : v.vigenteDesde > p.hoy ? " · futura" : ""}</button>
              <button onClick={() => borrar(v.vigenteDesde)} className="text-tenue hover:text-baja" aria-label="Borrar versión">×</button>
            </span>
          ))}
        </div>
        <p className="text-xs text-tenue">
          La ideal va cambiando: cada vez que la guardás queda una versión nueva con su fecha, y cada mes se compara contra la que regía.
          Editás sobre la versión marcada y la guardás como nueva (o con la misma fecha para corregirla).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">Vigente desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
          </label>
          {reemplaza && <span className="text-xs text-aviso">reemplaza la versión de esa fecha</span>}
          <p className={`text-sm font-semibold ${Math.abs(sumaCat - 100) < 0.01 ? "text-sube" : "text-baja"}`}>
            Categorías: {+sumaCat.toFixed(2)}% {Math.abs(sumaCat - 100) < 0.01 ? "✓" : "(tiene que dar 100%)"}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {estado.error && <span className="text-baja text-sm">{estado.error}</span>}
            {estado.ok && <span className="text-sube text-sm">{estado.ok}</span>}
            <button disabled={guardando} onClick={() => guardar(p.todas)} className="rounded-lg border border-marino text-marino px-4 py-2 text-sm font-semibold disabled:opacity-60">
              Copiar a las tres
            </button>
            <button disabled={guardando} onClick={() => guardar([p.hermana.id])} className="rounded-lg bg-marino text-white px-4 py-2 text-sm font-semibold disabled:opacity-60">
              {guardando ? "Guardando…" : `Guardar para ${p.hermana.nombre}`}
            </button>
          </div>
        </div>
      </section>

      {p.categorias.map((c) => {
        const pctC = num(b.pctCat[c.id] ?? "");
        const items = b.items[c.id];
        const suma = items.reduce((a, i) => a + num(i.pct), 0);
        const hoy = hoyCat(c.nombre);
        const delCatalogo = p.tickers.filter((t) => t.categoriaId === c.id);
        return (
          <section key={c.id} className="rounded-xl bg-white border border-borde overflow-hidden" style={{ borderLeft: `4px solid ${c.color}` }}>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-borde">
              <span className="font-bold" style={{ color: c.color }}>{c.nombre}</span>
              <span className="text-xs text-tenue">hoy <Pct valor={hoy} /></span>
              {pctC > 0 && <span className={`text-xs ${Math.abs(hoy - pctC / 100) > 0.05 ? "text-aviso font-semibold" : "text-tenue"}`}>desvío {fmtPct(hoy - pctC / 100, true)}</span>}
              {items.length > 0 && Math.abs(suma - 100) > 0.01 && <span className="text-xs text-baja">Los tickers suman {+suma.toFixed(2)}% (tiene que dar 100%)</span>}
              <span className="ml-auto text-sm text-tenue">% de la cartera:</span>
              <input value={b.pctCat[c.id] ?? ""} onChange={(e) => setB({ ...b, pctCat: { ...b.pctCat, [c.id]: e.target.value } })} inputMode="decimal" className={`${campo} w-20 text-right`} />
              <span className="text-sm">%</span>
            </div>
            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-tenue">
                      <th className="text-left px-4 py-2">Ticker</th><th className="text-right px-2">% de la categoría</th>
                      <th className="text-right px-2">% de la cartera</th><th className="text-right px-2">Hoy</th>
                      <th className="text-right px-2">Desvío</th><th className="text-right px-2">Precio</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => {
                      const tk = i.ticker.trim().toUpperCase();
                      const ideal = (pctC / 100) * (num(i.pct) / 100);
                      const t = info.get(tk);
                      const pr = p.precioArs(tk);
                      const otraCat = t?.categoriaId != null && t.categoriaId !== c.id;
                      const cambiar = (x: Partial<Item>) => setItems(c.id, items.map((y) => (y.id === i.id ? { ...y, ...x } : y)));
                      return (
                        <tr key={i.id} className="border-t border-borde/60">
                          <td className="px-4 py-1.5">
                            <span className="inline-flex items-center gap-2">
                              {tk && <Logo ticker={tk} color={c.color} tam={22} />}
                              <input value={i.ticker} onChange={(e) => cambiar({ ticker: e.target.value.toUpperCase() })} onBlur={() => tk && void p.pedirPrecios([tk])}
                                list={`ideal-cat-${c.id}`} className={`${campo} w-28 uppercase ${otraCat ? "border-baja" : ""}`} />
                              {otraCat && <span className="text-xs text-baja">es de {t.categoria}</span>}
                              {tk && !t && <span className="text-xs text-tenue italic">nuevo</span>}
                            </span>
                          </td>
                          <td className="px-2 text-right"><input value={i.pct} onChange={(e) => cambiar({ pct: e.target.value })} inputMode="decimal" className={`${campo} w-16 text-right`} /> %</td>
                          <td className="px-2 text-right font-semibold"><Pct valor={ideal} /></td>
                          <td className="px-2 text-right text-tenue"><Pct valor={hoyTicker(tk)} /></td>
                          <td className={`px-2 text-right num ${Math.abs(hoyTicker(tk) - ideal) > 0.05 ? "text-aviso font-semibold" : ""}`}>{fmtPct(hoyTicker(tk) - ideal, true)}</td>
                          <td className="px-2 text-right text-xs">
                            {pr ? <span className="inline-flex flex-col items-end leading-tight"><span className="num text-sm">$ {pr.toLocaleString("es-AR", { maximumFractionDigits: pr < 10_000 ? 2 : 0 })}{t && t.cotizaCada > 1 ? <span className="text-[10px] text-tenue"> /VN</span> : null}</span><span className="text-[10px] text-tenue">{etiquetaPrecio(t?.precioFecha, t?.actualizado)}</span></span>
                              : <span className="text-tenue">{t && !t.cotizable ? "no cotiza en IOL" : tk ? "sin precio" : ""}</span>}
                          </td>
                          <td className="px-2"><button onClick={() => setItems(c.id, items.filter((y) => y.id !== i.id))} className="text-tenue hover:text-baja" aria-label="Quitar">×</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <button onClick={() => setItems(c.id, [...items, { id: nuevoId(), ticker: "", pct: "" }])} className="text-sm text-marino hover:underline">+ Agregar ticker</button>
              {items.length > 1 && (
                <button onClick={() => setItems(c.id, items.map((i) => ({ ...i, pct: redondo(100 / items.length) })))} className="text-xs text-tenue hover:underline">repartir parejo</button>
              )}
              {items.length === 0 && pctC > 0 && <span className="text-xs text-tenue">Sin tickers: se compara la categoría entera, pero no se sugieren compras.</span>}
            </div>
            <datalist id={`ideal-cat-${c.id}`}>{delCatalogo.map((t) => <option key={t.ticker} value={t.ticker}>{t.nombre}</option>)}</datalist>
          </section>
        );
      })}
    </div>
  );
}
