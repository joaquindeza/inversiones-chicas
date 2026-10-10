// cotizar-iol — Trae de IOL el último precio de una lista de tickers (los tengan o no las chicas).
//
// SOLO LECTURA sobre IOL: login + GET de cotizaciones. Nunca compra, vende ni transfiere.
// Con el mercado cerrado, IOL devuelve el último precio operado (y su fecha): eso es lo que se guarda.
//
// Lo usa la planificación (cartera ideal y plan del mes) para calcular cuántos nominales entran.
// Quién la puede llamar: el admin logueado (Authorization: Bearer <su JWT>) o el cron (x-cron-token).
// Body: { "tickers": ["SPY", "MELI", ...] }. Responde cuando termina (son pocos tickers).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const IOL = "https://api.invertironline.com";
const MAX_TICKERS = 60;
// categorías que cotizan en BYMA por IOL: bonos/ONs, CEDEARs, acciones americanas y argentinas
const CATEGORIAS_IOL = [1, 2, 5, 6];

type Json = Record<string, unknown>;
const esUsd = (m: unknown) => String(m ?? "").toLowerCase().includes("dolar");

async function iolLogin(usuario: string, clave: string): Promise<string> {
  const r = await fetch(`${IOL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: usuario, password: clave, grant_type: "password" }),
  });
  if (!r.ok) throw new Error(`IOL no aceptó el login (${r.status})`);
  return (await r.json()).access_token;
}

/** fechaHora de IOL viene en hora de Buenos Aires sin zona: se la agrega. */
function fechaIol(s: unknown): string | null {
  const t = String(s ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(t) || t.startsWith("0001")) return null;
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(t) ? t : `${t}-03:00`;
}

Deno.serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-token" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const responder = (status: number, body: Json) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // ¿quién llama?
  const tokenCron = req.headers.get("x-cron-token");
  if (tokenCron) {
    const { data: ok } = await db.rpc("verificar_token_cron", { p_token: tokenCron });
    if (!ok) return responder(401, { error: "token inválido" });
  } else {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await db.auth.getUser(jwt);
    if (!u?.user) return responder(401, { error: "sin sesión" });
    const { data: p } = await db.from("perfiles").select("rol").eq("user_id", u.user.id).maybeSingle();
    if (p?.rol !== "admin") return responder(403, { error: "solo el admin" });
  }

  const body = await req.json().catch(() => ({}));
  const pedidos = [...new Set(((body.tickers ?? []) as unknown[]).map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
  if (!pedidos.length) return responder(400, { error: "faltan tickers" });

  // solo los del catálogo que operan por IOL (cripto o fondos no tienen cotización en BYMA)
  const { data: cat } = await db.from("tickers").select("ticker, plataforma, categoria_id")
    .in("ticker", pedidos.slice(0, MAX_TICKERS));
  const cotizables = (cat ?? []).filter((t) =>
    (t.plataforma ?? "IOL") === "IOL" && CATEGORIAS_IOL.includes(Number(t.categoria_id)) && /^[A-Z0-9.]+$/.test(t.ticker));
  if (!cotizables.length) return responder(200, { precios: [], errores: [] });

  // cualquier credencial sirve: las cotizaciones son las mismas para todas
  const { data: creds } = await db.from("iol_credenciales").select("hermana_id").order("ultimo_login_ok", { ascending: false, nullsFirst: false });
  let token: string | null = null;
  let errorLogin = "No hay credenciales de IOL cargadas";
  for (const c of creds ?? []) {
    try {
      const { data: cred } = await db.rpc("leer_credencial_iol", { p_hermana: c.hermana_id });
      if (!cred) continue;
      token = await iolLogin(cred.usuario, cred.clave);
      break;
    } catch (e) { errorLogin = (e as Error).message; }
  }
  if (!token) return responder(502, { error: errorLogin });

  const precios: Json[] = [];
  const errores: string[] = [];
  const ahora = new Date().toISOString();
  await Promise.all(cotizables.map(async ({ ticker }) => {
    try {
      const r = await fetch(`${IOL}/api/v2/bCBA/Titulos/${encodeURIComponent(ticker)}/Cotizacion`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const c = await r.json();
      const precio = Number(c.ultimoPrecio) || Number(c.cierreAnterior) || 0;
      if (!(precio > 0)) throw new Error("sin precio");
      const fila: Json = { precio, precio_fecha: fechaIol(c.fechaHora), actualizado: ahora, fuente: "IOL" };
      if (c.moneda) fila.moneda = esUsd(c.moneda) ? "USD" : "ARS";
      const { error } = await db.from("tickers").update(fila).eq("ticker", ticker);
      if (error) throw new Error(error.message);
      precios.push({ ticker, ...fila });
    } catch (e) {
      errores.push(`${ticker}: ${(e as Error).message}`);
    }
  }));
  return responder(200, { precios, errores });
});
