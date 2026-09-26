import { NextResponse, type NextRequest } from "next/server";
import { perfilActual } from "@/lib/sesion";

/** El admin entra a ver la app tal como la ve una hermana. */
export async function GET(request: NextRequest, { params }: RouteContext<"/mi/ver/[id]">) {
  const p = await perfilActual();
  if (p?.rol !== "admin") return NextResponse.redirect(new URL("/login", request.url));
  const res = NextResponse.redirect(new URL("/mi", request.url));
  res.cookies.set("ver_hermana", String(Number((await params).id) || 1), { path: "/", httpOnly: true, sameSite: "lax" });
  return res;
}
