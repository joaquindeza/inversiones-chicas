import Link from "next/link";
import { Titulo } from "@/components/ui";
import { categorias, hermanas, mepActual, movimientos, posiciones, resumenes, tickers } from "@/lib/datos";
import { esVisible } from "@/lib/porciones";
import { crearCliente } from "@/lib/supabase/server";
import type { Plan } from "./actions";
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
    items: items.filter((i) => i.nivel !== "Venta").map((i) => ({ nivel: i.nivel as "Bajo" | "Medio" | "Alto", ticker: i.ticker, pct: Number(i.pct_nivel ?? 0) * 100, categoriaId: null })),
    ventas: items.filter((i) => i.nivel === "Venta").map((i) => ({ ticker: i.ticker, cantidad: Number(i.cantidad) })),
  };
}

export default async function Planificacion({ searchParams }: PageProps<"/admin/planificacion">) {
  const sp = await searchParams;
  const hs = await hermanas();
  const h = hs.find((x) => x.id === Number(sp.h)) ?? hs[0];
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? `${sp.mes}-01` : `${hoy.slice(0, 7)}-01`;
  const finMes = mover(mes, 1);

  const [plan, anterior, tks, cats, pos, rs, movs, mep] = await Promise.all([
    cargarPlan(h.id, mes), cargarPlan(h.id, mover(mes, -1)), tickers(), categorias(), posiciones(h.id), resumenes(),
    movimientos({ hermana: h.id, desde: mes, hasta: new Date(Date.parse(finMes) - 86_400_000).toISOString().slice(0, 10) }), mepActual(),
  ]);
  const r = rs.find((x) => x.hermana_id === h.id);
  const ejecutado: Record<string, number> = {};
  for (const m of movs) if (m.tipo === "Compra" && m.ticker) ejecutado[m.ticker] = (ejecutado[m.ticker] ?? 0) + Number(m.monto_usd);
  const [a, mm] = mes.split("-");
  const url = (d: number) => `/admin/planificacion?h=${h.id}&mes=${mover(mes, d).slice(0, 7)}`;

  return (
    <>
      <Titulo sub="El plan del mes: cuánta plata, en qué niveles de riesgo y en qué tickers. Abajo, cómo quedaría la cartera.">Planificación</Titulo>
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
        tickers={tks.map((t) => ({ ticker: t.ticker!, nombre: t.nombre ?? "", categoria: t.categoria, categoriaId: t.categoria_id, color: t.categoria_color, precioUsd: t.precio_usd == null ? null : Number(t.precio_usd) }))}
        categorias={cats.map((c) => ({ id: c.id, nombre: c.nombre, color: c.color }))}
        posiciones={pos.filter(esVisible).map((p) => ({ ticker: p.ticker!, nombre: p.nombre ?? "", categoria: p.categoria!, color: p.categoria_color!, usd: Number(p.valor_usd), cantidad: Number(p.cantidad), precio: Number(p.precio_usado) }))}
        efectivoUsd={Number(r?.efectivo_usd ?? 0)}
        ejecutado={ejecutado}
      />
    </>
  );
}
