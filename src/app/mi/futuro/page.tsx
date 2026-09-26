import { proyeccion, resumenes, hermana } from "@/lib/datos";
import { edadEn } from "@/lib/proyeccion";
import { hermanaDeLaVista } from "@/lib/vista";
import { Simulador } from "./simulador";

export const metadata = { title: "Mi futuro" };

export default async function MiFuturo() {
  const { id } = await hermanaDeLaVista();
  const [rs, h, p] = await Promise.all([resumenes(), hermana(id), proyeccion(id)]);
  const r = rs.find((x) => x.hermana_id === id);
  if (!r || !h?.fecha_nacimiento) return <p className="bg-white rounded-2xl p-6">Falta la fecha de nacimiento para proyectar.</p>;

  // "hoy" se calcula en el servidor (hora de Argentina) para que servidor y celular coincidan
  const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const s = p.supuestos;
  return (
    <Simulador
      color={h.color}
      nacimiento={h.fecha_nacimiento}
      edad={edadEn(h.fecha_nacimiento, hoy)}
      anio={hoy.getFullYear()}
      mes={hoy.getMonth() + 1}
      valorActual={Number(r.total_usd)}
      aportadoHoy={Number(r.aportado_neto_usd)}
      supuestos={{
        rendimiento: Number(s?.rend_esperado ?? 0.1), pesimista: Number(s?.rend_pesimista ?? 0.05),
        optimista: Number(s?.rend_optimista ?? 0.15), edadHasta: Number(s?.edad_hasta ?? 40),
        meta: Number(s?.meta_usd ?? 10000), metaEdad: Number(s?.meta_edad ?? 25),
      }}
      tramos={p.tramos.map((t) => ({ desde_anio: t.desde_anio, hasta_anio: t.hasta_anio, monto_usd_mes: Number(t.monto_usd_mes), quien: t.quien }))}
      gastos={p.gastos.map((g) => ({ anio: g.anio, concepto: g.concepto, monto_usd: Number(g.monto_usd) }))}
    />
  );
}
