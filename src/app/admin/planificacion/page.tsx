import Link from "next/link";
import { Titulo } from "@/components/ui";
import { categorias, hermanas, mepActual, movimientos, posiciones, resumenes, tickers } from "@/lib/datos";
import { esVisible } from "@/lib/porciones";
import { crearCliente } from "@/lib/supabase/server";
import type { Ideal, Plan } from "./actions";
import { EditorPlan } from "./editor";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const mover = (mes: string, d: number) => {
  const [a, m] = mes.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1 + d, 1));
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

async function cargarPlan(hermana: number, mes: string): Promise<Plan | null> {
  const s = await crearCliente();
  const { data: p } = await s.from("planes").select("*, plan_items(*)").eq("hermana_id", hermana).eq("mes", mes).maybeSingle();
  if (!p) return null;
  const items = [...p.plan_items].sort((a, b) => a.orden - b.orden);
  return {
    mes, capital: Number(p.capital_ars), tc: Number(p.mep ?? 0), origen: p.origen_fondos,
    pctNivel: { Bajo: Number(p.pct_bajo) * 100, Medio: Number(p.pct_medio) * 100, Alto: Number(p.pct_alto) * 100 },
    items: items.filter((i) => i.nivel !== "Venta").map((i) => ({
      nivel: i.nivel as "Bajo" | "Medio" | "Alto", ticker: i.ticker, categoriaId: null,
      cantidad: i.cantidad == null ? null : Number(i.cantidad), precioArs: i.precio_ars == null ? null : Number(i.precio_ars),
      pct: i.pct_nivel == null ? null : Number(i.pct_nivel) * 100,
    })),
    ventas: items.filter((i) => i.nivel === "Venta").map((i) => ({ ticker: i.ticker, cantidad: Number(i.cantidad), precioArs: i.precio_ars == null ? null : Number(i.precio_ars) })),
  };
}

/** Todas las versiones de la cartera ideal de una hermana, de la más nueva a la más vieja (% de 0 a 100). */
async function cargarIdeales(hermana: number, categoriaDe: Map<string, number | null>): Promise<Ideal[]> {
  const s = await crearCliente();
  const { data } = await s.from("ideales").select("vigente_desde, ideal_categorias(categoria_id, pct), ideal_items(ticker, pct_categoria, orden)")
    .eq("hermana_id", hermana).order("vigente_desde", { ascending: false });
  return (data ?? []).map((v) => ({
    vigenteDesde: v.vigente_desde,
    categorias: v.ideal_categorias.map((c) => ({ categoriaId: c.categoria_id, pct: Number(c.pct) * 100 })),
    items: [...v.ideal_items].sort((a, b) => a.orden - b.orden)
      .map((i) => ({ ticker: i.ticker, categoriaId: categoriaDe.get(i.ticker) ?? 0, pct: Number(i.pct_categoria) * 100 })),
  }));
}

export default async function Planificacion({ searchParams }: PageProps<"/admin/planificacion">) {
  const sp = await searchParams;
  const hs = await hermanas();
  const h = hs.find((x) => x.id === Number(sp.h)) ?? hs[0];
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? `${sp.mes}-01` : `${hoy.slice(0, 7)}-01`;
  const finMes = mover(mes, 1);

  const ultimoDia = new Date(Date.parse(finMes) - 86_400_000).toISOString().slice(0, 10);
  const tks = await tickers();
  const [plan, anterior, cats, pos, rs, movs, mep, ideales] = await Promise.all([
    cargarPlan(h.id, mes), cargarPlan(h.id, mover(mes, -1)), categorias(), posiciones(h.id), resumenes(),
    movimientos({ hermana: h.id, desde: mes, hasta: ultimoDia }), mepActual(),
    cargarIdeales(h.id, new Map(tks.map((t) => [t.ticker!, t.categoria_id]))),
  ]);
  // la ideal contra la que se compara este mes: la última vigente al terminar el mes
  const idealDelMes = ideales.find((v) => v.vigenteDesde <= ultimoDia) ?? null;
  const r = rs.find((x) => x.hermana_id === h.id);
  const ejecutado: Record<string, number> = {};
  for (const m of movs) if (m.tipo === "Compra" && m.ticker) ejecutado[m.ticker] = (ejecutado[m.ticker] ?? 0) + Number(m.monto_usd);
  const [a, mm] = mes.split("-");
  const url = (d: number) => `/admin/planificacion?h=${h.id}&mes=${mover(mes, d).slice(0, 7)}`;

  return (
    <>
      <Titulo sub="El plan del mes: cuánta plata, en qué niveles de riesgo y cuántos nominales de cada ticker, contra la cartera ideal.">Planificación</Titulo>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2 text-sm">
          {hs.map((x) => (
            <Link key={x.id} href={`/admin/planificacion?h=${x.id}&mes=${mes.slice(0, 7)}`}
              className={`rounded-full px-4 py-1.5 border ${x.id === h.id ? "text-white border-transparent" : "bg-white border-borde"}`}
              style={x.id === h.id ? { background: x.color } : undefined}>{x.nombre}</Link>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Link href={url(-1)} className="rounded-md border border-borde bg-white size-9 grid place-items-center" aria-label="Mes anterior">←</Link>
          <p className="font-bold text-lg min-w-44 text-center">{MESES[Number(mm) - 1]} de {a}</p>
          <Link href={url(1)} className="rounded-md border border-borde bg-white size-9 grid place-items-center" aria-label="Mes siguiente">→</Link>
        </div>
      </div>
      <EditorPlan
        key={`${h.id}-${mes}`}
        hermana={{ id: h.id, nombre: h.nombre, color: h.color }}
        todas={hs.map((x) => x.id)}
        mes={mes}
        plan={plan}
        anterior={plan ? null : anterior}
        mep={mep.valor}
        tickers={tks.map((t) => ({
          ticker: t.ticker!, nombre: t.nombre ?? "", categoria: t.categoria, categoriaId: t.categoria_id, color: t.categoria_color,
          precio: t.precio == null ? null : Number(t.precio), moneda: t.moneda ?? "ARS", cotizaCada: Number(t.cotiza_cada ?? 1),
          precioUsd: t.precio_usd == null ? null : Number(t.precio_usd), actualizado: t.actualizado, precioFecha: t.precio_fecha,
          cotizable: (t.plataforma ?? "IOL") === "IOL" && [1, 2, 5, 6].includes(Number(t.categoria_id)),
        }))}
        categorias={cats.map((c) => ({ id: c.id, nombre: c.nombre, color: c.color, objetivoViejo: c.objetivo_pct == null ? null : Number(c.objetivo_pct) * 100 }))}
        ideales={ideales}
        ideal={idealDelMes}
        hoy={hoy}
        tabInicial={sp.tab === "ideal" ? "ideal" : sp.tab === "tenencias" ? "tenencias" : "plan"}
        posiciones={pos.filter(esVisible).map((p) => ({ ticker: p.ticker!, nombre: p.nombre ?? "", categoria: p.categoria!, color: p.categoria_color!, usd: Number(p.valor_usd), cantidad: Number(p.cantidad), precio: Number(p.precio_usado) }))}
        efectivoUsd={Number(r?.efectivo_usd ?? 0)}
        ejecutado={ejecutado}
      />
    </>
  );
}
