import { NextResponse, type NextRequest } from "next/server";
import { perfilActual } from "@/lib/sesion";
import { crearCliente } from "@/lib/supabase/server";

/**
 * Recordatorio de aporte (idea 10): un archivo de calendario con un evento mensual por cada plan
 * activo. Se abre con Google Calendar / Outlook / el calendario del celular y queda repitiéndose.
 */
export async function GET(request: NextRequest) {
  const p = await perfilActual();
  if (p?.rol !== "admin") return NextResponse.redirect(new URL("/login", request.url));
  const s = await crearCliente();
  const [{ data: planes }, { data: hs }] = await Promise.all([
    s.from("plan_aportes").select("*").eq("activo", true),
    s.from("hermanas").select("id, nombre"),
  ]);
  const nombre = new Map((hs ?? []).map((h) => [h.id, h.nombre]));
  const ahora = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const eventos = (planes ?? []).map((pl) => {
    const [a, m] = pl.desde.split("-");
    const inicio = `${a}${m}${String(pl.dia_mes).padStart(2, "0")}`;
    const monto = `${pl.moneda === "USD" ? "US$" : "$"} ${Number(pl.monto).toLocaleString("es-AR")}`;
    return [
      "BEGIN:VEVENT",
      `UID:aporte-${pl.hermana_id}@inversiones-chicas`,
      `DTSTAMP:${ahora}`,
      `DTSTART;VALUE=DATE:${inicio}`,
      "RRULE:FREQ=MONTHLY",
      `SUMMARY:Aporte a ${nombre.get(pl.hermana_id)}: ${monto}`,
      `DESCRIPTION:Depositar en IOL y después cargarlo en la app (o esperar el aviso del sync).`,
      "BEGIN:VALARM", "TRIGGER:PT9H", "ACTION:DISPLAY", `DESCRIPTION:Aporte a ${nombre.get(pl.hermana_id)}`, "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Inversiones Chicas//ES", "CALSCALE:GREGORIAN", ...eventos, "END:VCALENDAR"].join("\r\n");
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="aportes.ics"' },
  });
}
