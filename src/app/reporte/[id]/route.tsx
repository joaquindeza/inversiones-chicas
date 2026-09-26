import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";
import { hermana, posiciones, resumenes, seguimiento } from "@/lib/datos";
import { fmtDinero, fmtMes, fmtPct } from "@/lib/formato";
import { perfilActual } from "@/lib/sesion";

/**
 * Reporte mensual compartible (idea 9): una imagen vertical para mandar por WhatsApp.
 * Lee con la sesión de quien la pide: el RLS hace que cada hermana solo pueda generar la suya.
 * ?mes=AAAA-MM (por defecto, el mes en curso).
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/reporte/[id]">) {
  const p = await perfilActual();
  if (!p) return NextResponse.redirect(new URL("/login", request.url));
  const id = p.rol === "hermana" ? p.hermanaId! : Number((await params).id);
  const [h, rs, seg, pos] = await Promise.all([hermana(id), resumenes(), seguimiento(id), posiciones(id)]);
  const r = rs.find((x) => x.hermana_id === id);
  if (!h || !r) return new NextResponse("No encontrado", { status: 404 });

  const pedido = request.nextUrl.searchParams.get("mes");
  const mes = seg.find((m) => (pedido ? m.mes?.startsWith(pedido) : m.es_mes_actual)) ?? seg[seg.length - 1];
  const valor = Number(mes?.cierre_usd ?? r.total_usd);
  const rendMes = mes?.rendimiento_mes == null ? null : Number(mes.rendimiento_mes);
  const rendTotal = r.rendimiento == null ? null : Number(r.rendimiento);
  const top = pos.filter((x) => x.activa).slice(0, 4);
  const aportado = Number(r.aportado_neto_usd);
  const propio = aportado > 0 ? Number(r.aportes_propio_usd) / aportado : 0;
  const c = h.color;

  const fila = (etq: string, val: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 38, padding: "14px 0", borderBottom: "2px solid #eef0f4" }}>
      <span style={{ color: "#6b7280" }}>{etq}</span><span style={{ fontWeight: 700 }}>{val}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F5F7FA", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", background: c, color: "white", padding: "70px 70px 120px" }}>
          <span style={{ fontSize: 40, opacity: 0.85 }}>La cartera de {h.nombre} · {mes?.mes ? fmtMes(mes.mes) : ""}</span>
          <span style={{ fontSize: 120, fontWeight: 900, marginTop: 20 }}>{fmtDinero(valor)}</span>
          <span style={{ fontSize: 44, marginTop: 10 }}>
            {rendMes == null ? "Primer mes" : `Este mes ${rendMes >= 0 ? "subió" : "bajó"} ${fmtPct(Math.abs(rendMes))}`}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", background: "white", margin: "-70px 50px 0", borderRadius: 40, padding: "40px 50px" }}>
          {fila("Se puso en total", fmtDinero(aportado))}
          {fila("Resultado desde el inicio", `${rendTotal == null ? "—" : fmtPct(rendTotal, true)}`)}
          {fila("Puesto por vos", fmtPct(propio))}
          <span style={{ fontSize: 34, color: "#6b7280", marginTop: 34 }}>Donde más está invertida</span>
          {top.map((x) => (
            <div key={x.ticker} style={{ display: "flex", alignItems: "center", fontSize: 38, marginTop: 16 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: x.categoria_color ?? "#999", marginRight: 18 }} />
              <span style={{ fontWeight: 700, marginRight: 14 }}>{x.ticker}</span>
              <span style={{ color: "#6b7280", flex: 1 }}>{(x.nombre ?? "").slice(0, 22)}</span>
              <span>{fmtPct(Number(r.total_usd) ? Number(x.valor_usd) / Number(r.total_usd) : null)}</span>
            </div>
          ))}
        </div>
        <span style={{ display: "flex", justifyContent: "center", fontSize: 30, color: "#6b7280", marginTop: "auto", marginBottom: 50 }}>
          Todo en dólares MEP · Inversiones Chicas
        </span>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "private, no-store" } },
  );
}
