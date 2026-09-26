// "¿Valió la pena?": qué habría pasado si cada aporte, el mismo día y por el mismo monto, hubiera ido
// a otra alternativa en vez de a la cartera.

export type Flujo = { fecha: string; usd: number; ars: number }; // aportes (+) y retiros (−)
export type Serie = { fecha: string; valor: number }[];
export type Alternativa = { nombre: string; usd: number; detalle: string };

/** Último valor con fecha <= f (o el primero disponible si f es anterior a toda la serie). */
function valorEn(serie: Serie, f: string): number | null {
  if (!serie.length) return null;
  let v = serie[0].valor;
  for (const p of serie) {
    if (p.fecha > f) break;
    v = p.valor;
  }
  return v;
}

export function compararAlternativas(flujos: Flujo[], series: { sp500: Serie; merval: Serie; tna: Serie }, mepHoy: number, hoy: string): Alternativa[] {
  const alt: Alternativa[] = [];
  const aportado = flujos.reduce((a, f) => a + f.usd, 0);
  alt.push({ nombre: "Dólares abajo del colchón", usd: aportado, detalle: "Comprar dólares y guardarlos: no ganan ni pierden en dólares." });

  const spHoy = valorEn(series.sp500, hoy);
  if (spHoy) {
    const unidades = flujos.reduce((a, f) => a + f.usd / valorEn(series.sp500, f.fecha)!, 0);
    alt.push({ nombre: "S&P 500", usd: unidades * spHoy, detalle: "Las 500 empresas más grandes de Estados Unidos, en dólares." });
  }

  const mvHoy = valorEn(series.merval, hoy);
  if (mvHoy && mepHoy) {
    const unidades = flujos.reduce((a, f) => a + f.ars / valorEn(series.merval, f.fecha)!, 0);
    alt.push({ nombre: "Merval", usd: (unidades * mvHoy) / mepHoy, detalle: "Las principales acciones argentinas, en pesos y pasado a dólares hoy." });
  }

  if (series.tna.length && mepHoy) {
    // plazo fijo renovado todos los días a la tasa del BCRA (aproximación de renovar cada 30 días)
    let pesos = 0;
    const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
    const ordenados = [...flujos].sort((a, b) => a.fecha.localeCompare(b.fecha));
    for (let i = 0; i < ordenados.length; i++) {
      pesos += ordenados[i].ars;
      const hasta = i + 1 < ordenados.length ? ordenados[i + 1].fecha : hoy;
      for (let d = 0, f = ordenados[i].fecha; d < dias(ordenados[i].fecha, hasta); d++) {
        pesos *= 1 + (valorEn(series.tna, f) ?? 0) / 100 / 365;
        f = new Date(Date.parse(f) + 86_400_000).toISOString().slice(0, 10);
      }
    }
    alt.push({ nombre: "Plazo fijo en pesos", usd: pesos / mepHoy, detalle: "Pesos en el banco a 30 días, renovando siempre, pasados a dólares hoy." });
  }
  return alt;
}
