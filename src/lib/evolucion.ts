import type { MesSeguimiento } from "@/lib/datos";
import type { PuntoEvolucion } from "@/components/graficos";

/** Serie "aportado vs. patrimonio" desde v_seguimiento. Si vienen varias hermanas, las suma por mes. */
export function serieEvolucion(filas: MesSeguimiento[]): PuntoEvolucion[] {
  const porMes = new Map<string, PuntoEvolucion>();
  // aportado en pesos: acumulado de lo que efectivamente entró en pesos, por hermana
  const acumArs = new Map<number, number>();
  for (const f of [...filas].sort((a, b) => (a.mes! < b.mes! ? -1 : 1))) {
    const h = f.hermana_id!;
    const ars = (acumArs.get(h) ?? 0) + Number(f.ingresos_ars ?? 0) - Number(f.retiros_ars ?? 0);
    acumArs.set(h, ars);
    const p = porMes.get(f.mes!) ?? { mes: f.mes!, aportadoUsd: 0, patrimonioUsd: 0, aportadoArs: 0, patrimonioArs: 0 };
    p.aportadoUsd += Number(f.aportado_acum_usd ?? 0);
    p.aportadoArs += ars;
    p.patrimonioUsd = f.cierre_usd == null || p.patrimonioUsd == null ? null : p.patrimonioUsd + Number(f.cierre_usd);
    p.patrimonioArs = f.cierre_ars == null || p.patrimonioArs == null ? null : p.patrimonioArs + Number(f.cierre_ars);
    porMes.set(f.mes!, p);
  }
  return [...porMes.values()];
}
