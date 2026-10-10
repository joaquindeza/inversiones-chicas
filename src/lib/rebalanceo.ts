// Sugerencia de compras para acercar la cartera a la ideal, solo comprando (nunca sugiere ventas).
// Lógica pura, sin base: se puede verificar a mano.
//
// 1. A cada ticker le falta (objetivo - lo que ya tiene). Los que están pasados no reciben nada.
// 2. El presupuesto se reparte en proporción a lo que falta (o se cubre todo lo que falta si alcanza).
// 3. Se redondea a nominales enteros para abajo.
// 4. Con lo que sobra se compra de a un nominal más, siempre al que más le falta, mientras el precio
//    entre y comprarlo acerque al objetivo (que le falte al menos medio nominal). Las ONs, que cotizan
//    cada 100 nominales, tienen un precio por nominal chico y absorben el resto.

export type Candidato = { ticker: string; objetivoUsd: number; actualUsd: number; precioUsd: number };
export type Compra = { ticker: string; cantidad: number; montoUsd: number };

export function sugerirCompras(candidatos: Candidato[], presupuestoUsd: number): { compras: Compra[]; sobranteUsd: number } {
  const cs = candidatos.filter((c) => c.precioUsd > 0);
  const falta = cs.map((c) => Math.max(0, c.objetivoUsd - c.actualUsd));
  const totalFalta = falta.reduce((a, b) => a + b, 0);
  const presupuesto = Math.max(0, presupuestoUsd);
  const cant = cs.map((c, i) => {
    const gasto = totalFalta > presupuesto ? presupuesto * (falta[i] / totalFalta) : falta[i];
    return Math.floor(gasto / c.precioUsd + 1e-9);
  });
  let sobra = presupuesto - cs.reduce((a, c, i) => a + cant[i] * c.precioUsd, 0);

  for (let vueltas = 0; vueltas < 100_000; vueltas++) {
    let mejor = -1, mayorFalta = 0;
    cs.forEach((c, i) => {
      const resta = falta[i] - cant[i] * c.precioUsd;
      if (c.precioUsd <= sobra + 1e-9 && resta >= c.precioUsd / 2 && resta > mayorFalta) { mejor = i; mayorFalta = resta; }
    });
    if (mejor < 0) break;
    cant[mejor]++;
    sobra -= cs[mejor].precioUsd;
  }

  return {
    compras: cs.map((c, i) => ({ ticker: c.ticker, cantidad: cant[i], montoUsd: cant[i] * c.precioUsd })).filter((x) => x.cantidad > 0),
    sobranteUsd: Math.max(0, sobra),
  };
}

/** % de la cartera de cada ticker y de cada categoría según una ideal (% de 0 a 1). */
export function pesosIdeales(ideal: { categorias: { categoriaId: number; pct: number }[]; items: { ticker: string; categoriaId: number; pct: number }[] }) {
  const cat = new Map(ideal.categorias.map((c) => [c.categoriaId, c.pct]));
  const ticker = new Map(ideal.items.map((i) => [i.ticker, (cat.get(i.categoriaId) ?? 0) * i.pct]));
  return { categoria: cat, ticker };
}
