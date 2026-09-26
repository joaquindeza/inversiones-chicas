// Proyección de interés compuesto: las mismas fórmulas que la solapa de cada hermana en el Excel
// (FV y PMT con tasa mensual equivalente, aportes a fin de mes, gastos que se descuentan al cierre del año).

export type Tramo = { desde_anio: number; hasta_anio: number; monto_usd_mes: number; quien: string };
export type Gasto = { anio: number; concepto: string; monto_usd: number };
export type Supuestos = {
  edad: number; anio: number; mes: number; // hoy (mes 1-12)
  valorActual: number; aportadoHoy: number;
  rendimiento: number; pesimista: number; optimista: number; edadHasta: number;
  tramos: Tramo[]; gastos: Gasto[];
};
export type FilaProyeccion = {
  anio: number; edad: number; aporteJoaquin: number; aportePropio: number; gastos: number;
  conAporte: number; sinAporte: number; aportado: number; pesimista: number; optimista: number;
};

export const tasaMensual = (anual: number) => Math.pow(1 + anual, 1 / 12) - 1;

/** Valor futuro con pagos a fin de período (FV de Excel, con signos positivos). */
export function fv(r: number, n: number, pago: number, inicial: number) {
  if (n <= 0) return inicial;
  const f = Math.pow(1 + r, n);
  return inicial * f + (r === 0 ? pago * n : pago * (f - 1) / r);
}

/** Aporte mensual necesario para llegar a `meta` en `n` meses partiendo de `inicial` (PMT de Excel). */
export function aporteNecesario(r: number, n: number, inicial: number, meta: number) {
  if (n <= 0) return null;
  const f = Math.pow(1 + r, n);
  const pago = r === 0 ? (meta - inicial) / n : ((meta - inicial * f) * r) / (f - 1);
  return Math.max(0, pago);
}

const aporteDelAnio = (tramos: Tramo[], anio: number, quien: string) =>
  tramos.filter((t) => t.quien === quien && t.desde_anio <= anio && t.hasta_anio >= anio)
    .reduce((a, t) => a + Number(t.monto_usd_mes), 0);

export function proyectar(s: Supuestos): FilaProyeccion[] {
  const rs = { base: tasaMensual(s.rendimiento), pes: tasaMensual(s.pesimista), opt: tasaMensual(s.optimista) };
  const filas: FilaProyeccion[] = [];
  let con = s.valorActual, sin = s.valorActual, pes = s.valorActual, opt = s.valorActual, aportado = s.aportadoHoy;
  const anios = Math.max(1, Math.min(60, s.edadHasta - s.edad + 1));
  for (let j = 0; j < anios; j++) {
    const anio = s.anio + j;
    const meses = j === 0 ? Math.max(0, 12 - s.mes) : 12; // el año en curso: los meses que faltan
    const j1 = aporteDelAnio(s.tramos, anio, "Joaquín");
    const p1 = aporteDelAnio(s.tramos, anio, "Propio");
    const gastos = s.gastos.filter((g) => g.anio === anio).reduce((a, g) => a + Number(g.monto_usd), 0);
    con = fv(rs.base, meses, j1 + p1, con) - gastos;
    sin = fv(rs.base, meses, j1, sin) - gastos;
    pes = fv(rs.pes, meses, j1 + p1, pes) - gastos;
    opt = fv(rs.opt, meses, j1 + p1, opt) - gastos;
    aportado += (j1 + p1) * meses;
    filas.push({ anio, edad: s.edad + j, aporteJoaquin: j1 * meses, aportePropio: p1 * meses, gastos, conAporte: con, sinAporte: sin, aportado, pesimista: pes, optimista: opt });
  }
  return filas;
}

/** Edad cumplida a una fecha. */
export function edadEn(nacimiento: string, hoy = new Date()): number {
  const [a, m, d] = nacimiento.split("-").map(Number);
  let e = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) e--;
  return e;
}
