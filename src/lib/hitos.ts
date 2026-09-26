import type { MesSeguimiento, MovimientoV } from "@/lib/datos";

// Línea de tiempo de la cartera (idea 7): los momentos que le dan narrativa a los números.

export type Hito = { fecha: string; titulo: string; texto: string; icono: string };

export function hitos(movs: MovimientoV[], meses: MesSeguimiento[], categoriaDe: Map<string, string>): Hito[] {
  const orden = [...movs].sort((a, b) => (a.fecha! < b.fecha! ? -1 : a.fecha! > b.fecha! ? 1 : a.id! - b.id!));
  const h: Hito[] = [];
  const primero = (cond: (m: MovimientoV) => boolean) => orden.find(cond);

  const ap = primero((m) => m.tipo === "Aporte" && m.aportante !== "Regalo");
  if (ap) h.push({ fecha: ap.fecha!, icono: "🌱", titulo: "Primer aporte", texto: "Empezó tu cartera." });
  const reg = primero((m) => m.aportante === "Regalo");
  if (reg) h.push({ fecha: reg.fecha!, icono: "🎁", titulo: "Primer regalo", texto: reg.nota ?? "Te regalaron una inversión." });
  const co = primero((m) => m.tipo === "Compra");
  if (co) h.push({ fecha: co.fecha!, icono: "🛒", titulo: "Primera compra", texto: `Compraste ${co.ticker}.` });
  const on = primero((m) => m.tipo === "Compra" && categoriaDe.get(m.ticker ?? "") === "Bonos / ONs");
  if (on) h.push({ fecha: on.fecha!, icono: "🏦", titulo: "Primera ON o bono", texto: `Le prestaste plata a una empresa o al Estado (${on.ticker}).` });
  const div = primero((m) => m.tipo === "Renta/Dividendo");
  if (div) h.push({ fecha: div.fecha!, icono: "💸", titulo: "Primer dividendo o renta", texto: `${div.ticker ?? "Una inversión"} te pagó por ser dueña o acreedora.` });
  const propio = primero((m) => m.tipo === "Aporte" && m.aportante === "Propio");
  if (propio) h.push({ fecha: propio.fecha!, icono: "💪", titulo: "Tu primer aporte propio", texto: "La primera plata que pusiste vos." });

  const cerrados = meses.filter((m) => m.rendimiento_mes != null && !m.es_mes_actual);
  if (cerrados.length >= 2) {
    const mejor = cerrados.reduce((a, b) => (Number(b.rendimiento_mes) > Number(a.rendimiento_mes) ? b : a));
    if (Number(mejor.rendimiento_mes) > 0) {
      h.push({ fecha: mejor.mes!, icono: "🚀", titulo: "El mes que más creció", texto: `Subió ${(Number(mejor.rendimiento_mes) * 100).toFixed(1).replace(".", ",")}%.` });
    }
  }
  for (const meta of [100, 500, 1000, 5000, 10000]) {
    const m = meses.find((x) => Number(x.cierre_usd ?? 0) >= meta);
    if (m) h.push({ fecha: m.mes!, icono: "⭐", titulo: `Pasaste los US$ ${meta.toLocaleString("es-AR")}`, texto: "Un escalón más." });
  }
  return h.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
