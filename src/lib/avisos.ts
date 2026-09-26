import "server-only";
import { crearCliente } from "@/lib/supabase/server";
import { fmtFecha, fmtPct } from "@/lib/formato";

// Avisos que se calculan al vuelo (idea 2 y 10). Los que detecta el sync contra IOL viven en la
// tabla alertas; estos salen de las reglas configurables y del plan de aportes.

export type Aviso = { icono: string; texto: string; href?: string; tipo: string };

/** Fecha (AAAA-MM-DD) de hace n días. */
export const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

const hoyAr = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

export type MesPlan = { mes: string; estado: "cumplido" | "parcial" | "falta" | "pendiente"; aportado: number };

/** Cumplimiento del plan de aportes, mes a mes, en el año en curso. */
export function cumplimiento(
  plan: { monto: number; moneda: string; dia_mes: number; aportante: string; desde: string },
  aportes: { fecha: string; monto_ars: number; monto_usd: number; aportante: string | null }[],
  hoy = hoyAr(),
): MesPlan[] {
  const anio = hoy.slice(0, 4);
  const desde = plan.desde > `${anio}-01-01` ? plan.desde.slice(0, 7) : `${anio}-01`;
  const meses: MesPlan[] = [];
  for (let m = desde; m <= hoy.slice(0, 7); m = siguienteMes(m)) {
    const aportado = aportes.filter((a) => a.fecha.startsWith(m) && a.aportante === plan.aportante)
      .reduce((s, a) => s + (plan.moneda === "USD" ? Number(a.monto_usd) : Number(a.monto_ars)), 0);
    const esActual = m === hoy.slice(0, 7);
    const estado = aportado >= plan.monto * 0.95 ? "cumplido"
      : esActual && Number(hoy.slice(8, 10)) < plan.dia_mes ? "pendiente"
      : aportado > 0 ? "parcial" : "falta";
    meses.push({ mes: `${m}-01`, estado, aportado });
  }
  return meses;
}

function siguienteMes(m: string) {
  const [a, mm] = m.split("-").map(Number);
  return mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, "0")}`;
}

export async function avisosCalculados(): Promise<Aviso[]> {
  const s = await crearCliente();
  const hoy = hoyAr();
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const [{ data: reglas }, { data: cats }, { data: pos }, { data: tks }, { data: hist }, { data: eventos }, { data: planes }, { data: aportes }, { data: hs }] = await Promise.all([
    s.from("reglas_alerta").select("*"),
    s.from("v_categorias_hermana").select("*"),
    s.from("v_posiciones").select("hermana_id, ticker, activa"),
    s.from("v_tickers").select("ticker, precio_usd"),
    s.from("precios_hist").select("ticker, fecha, precio_usd").gte("fecha", inicioMes).order("fecha"),
    s.from("eventos").select("*").gte("fecha", hoy).order("fecha"),
    s.from("plan_aportes").select("*").eq("activo", true),
    s.from("v_movimientos").select("hermana_id, fecha, monto_ars, monto_usd, aportante").eq("tipo", "Aporte").gte("fecha", inicioMes),
    s.from("hermanas").select("id, nombre"),
  ]);
  const regla = (t: string) => (reglas ?? []).find((r) => r.tipo === t && r.activa);
  const nombre = new Map((hs ?? []).map((h) => [h.id, h.nombre]));
  const avisos: Aviso[] = [];

  const rd = regla("desvio_categoria");
  if (rd) {
    for (const c of cats ?? []) {
      if (c.desvio != null && Math.abs(Number(c.desvio)) > Number(rd.umbral ?? 0.05)) {
        avisos.push({ tipo: "desvio", icono: "⚖", href: `/admin/cartera/${c.hermana_id}`,
          texto: `${nombre.get(c.hermana_id!)}: ${c.categoria} está en ${fmtPct(Number(c.pct))} (objetivo ${fmtPct(Number(c.objetivo_pct))}). Toca rebalancear.` });
      }
    }
  }

  const rm = regla("movimiento_posicion");
  if (rm) {
    const primero = new Map<string, number>();
    for (const h of hist ?? []) if (!primero.has(h.ticker)) primero.set(h.ticker, Number(h.precio_usd));
    const actual = new Map((tks ?? []).map((t) => [t.ticker!, Number(t.precio_usd)]));
    const vistos = new Set<string>();
    for (const p of (pos ?? []).filter((x) => x.activa)) {
      const ini = primero.get(p.ticker!), fin = actual.get(p.ticker!);
      if (!ini || !fin || vistos.has(p.ticker!)) continue;
      const cambio = fin / ini - 1;
      if (Math.abs(cambio) > Number(rm.umbral ?? 0.15)) {
        vistos.add(p.ticker!);
        avisos.push({ tipo: "movimiento", icono: cambio > 0 ? "📈" : "📉",
          texto: `${p.ticker} ${cambio > 0 ? "subió" : "bajó"} ${fmtPct(Math.abs(cambio))} en el mes (en dólares).` });
      }
    }
  }

  const rv = regla("vencimiento_on");
  if (rv) {
    const limite = new Date(Date.parse(hoy) + Number(rv.umbral ?? 7) * 86_400_000).toISOString().slice(0, 10);
    for (const e of (eventos ?? []).filter((x) => x.fecha <= limite)) {
      avisos.push({ tipo: "vencimiento", icono: "📅", texto: `${fmtFecha(e.fecha)}: ${e.ticker ? `${e.ticker} — ` : ""}${e.descripcion}` });
    }
  }

  for (const p of planes ?? []) {
    const meses = cumplimiento(
      { monto: Number(p.monto), moneda: p.moneda, dia_mes: p.dia_mes, aportante: p.aportante, desde: p.desde },
      (aportes ?? []).filter((a) => a.hermana_id === p.hermana_id).map((a) => ({ fecha: a.fecha!, monto_ars: Number(a.monto_ars), monto_usd: Number(a.monto_usd), aportante: a.aportante })),
    );
    const esteMes = meses[meses.length - 1];
    if (esteMes && (esteMes.estado === "falta" || esteMes.estado === "parcial")) {
      avisos.push({ tipo: "aporte", icono: "🔔",
        texto: `Aporte de ${nombre.get(p.hermana_id)} del día ${p.dia_mes}: ${p.moneda === "USD" ? "US$" : "$"} ${Number(p.monto).toLocaleString("es-AR")} ${esteMes.estado === "parcial" ? "(cargado en parte)" : "todavía sin registrar"}.` });
    }
  }
  return avisos;
}
