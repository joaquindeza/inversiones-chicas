import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/sesion";

export default async function Inicio() {
  const p = await perfilActual();
  redirect(!p ? "/login" : p.rol === "admin" ? "/admin" : "/mi");
}
