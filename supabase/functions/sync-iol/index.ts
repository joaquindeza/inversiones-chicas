// sync-iol — Sincroniza la base con InvertirOnline (IOL). Port de iol_sync_v2.py.
//
// SOLO LECTURA sobre IOL: estado de cuenta, portafolio, operaciones y cotizaciones.
// Nunca compra, vende ni transfiere (esos endpoints existen en la API; acá no se usan).
//
// Qué hace cada corrida:
//  1. Dólar MEP de Ámbito: cotización en vivo + completa el histórico.
//  2. Por cada hermana con credencial: efectivo real (total - títulos valorizados, porque el
//     "disponible" de IOL descuenta lo reservado para órdenes pendientes), precios de sus tickers
//     y operaciones terminadas que falten (sin duplicar por número; el monto incluye comisiones).
//  3. Graba el cierre del mes en curso.
//  4. Controla contra IOL (cantidades por ticker y efectivo) y deja alertas: aporte sin registrar
//     (IOL no expone los depósitos), títulos que no cuadran, órdenes pendientes.
//
// Quién la puede disparar: el cron (header x-cron-token, validado contra Vault) o el admin
// logueado (Authorization: Bearer <su JWT>). Responde enseguida y sigue en segundo plano.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const IOL = "https://api.invertironline.com";
const TOL_CANT = 1e-6;
const UA = { "User-Agent": "Mozilla/5.0 (inversiones-chicas)" };

type Json = Record<string, unknown>;
type Aviso = { tipo: string; clave: string; mensaje: string; datos?: Json };

const CAT = { bonos: 1, cedears: 2, fondosUsd: 4, disponibilidades: 7, accionesAr: 6 };

// ------------------------------------------------------------------ utilidades
const numAr = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const hoyAr = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const esUsd = (m: unknown) => String(m ?? "").toLowerCase().includes("dolar");

function categoria(titulo: Json): number {
  const t = String(titulo.tipo ?? "").toLowerCase();
  if (t.includes("cedear")) return CAT.cedears;
  if (["obligac", "titulospublicos", "titulos publicos", "bono", "letra"].some((k) => t.includes(k))) return CAT.bonos;
  if (t.includes("fondo") || t.includes("fci")) return esUsd(titulo.moneda) ? CAT.fondosUsd : CAT.disponibilidades;
  if (t.includes("accion")) return CAT.accionesAr;
  return CAT.cedears;
}

function tipoMov(tipoIol: unknown): "Compra" | "Venta" | "Renta/Dividendo" | null {
  const t = String(tipoIol ?? "").toLowerCase();
  if (t.includes("venta") || t.includes("rescate")) return "Venta";
  if (t.includes("compra") || t.includes("suscrip")) return "Compra";
  if (["dividend", "renta", "amortiz", "cupon"].some((k) => t.includes(k))) return "Renta/Dividendo";
  return null;
}

// ------------------------------------------------------------------ MEP (Ámbito)
async function mepAmbito(desde: string, hasta: string): Promise<Map<string, number>> {
  const res = new Map<string, number>();
  const pedir = async (a: string, b: string) => {
    const r = await fetch(`https://mercados.ambito.com/dolarrava/mep/historico-general/${a}/${b}`, { headers: UA });
    if (!r.ok) throw new Error(`Ámbito ${r.status}`);
    const filas = (await r.json()) as string[][];
    for (const [f, v] of filas.slice(1)) {
      const [d, m, y] = f.split("/");
      res.set(`${y}-${m}-${d}`, numAr(v));
    }
  };
  // Ámbito devuelve 500 si en el tramo hay algún dato roto: se parte al medio hasta aislarlo.
  const seguro = async (a: Date, b: Date): Promise<void> => {
    try {
      await pedir(iso(a), iso(b));
    } catch {
      if (iso(a) === iso(b)) return;
      const medio = new Date(a.getTime() + Math.floor((b.getTime() - a.getTime()) / 86_400_000 / 2) * 86_400_000);
      await seguro(a, medio);
      await seguro(new Date(medio.getTime() + 86_400_000), b);
    }
  };
  const ini = new Date(`${desde}T00:00:00Z`), fin = new Date(`${hasta}T00:00:00Z`);
  for (let y = ini.getUTCFullYear(); y <= fin.getUTCFullYear(); y++) {
    const a = new Date(Math.max(ini.getTime(), Date.UTC(y, 0, 1)));
    const b = new Date(Math.min(fin.getTime(), Date.UTC(y, 11, 31)));
    if (a <= b) await seguro(a, b);
  }
  return res;
}

async function mepVivo(): Promise<{ valor: number; fecha: string; fuente: string }> {
  try {
    const r = await fetch("https://mercados.ambito.com/dolarrava/mep/variacion", { headers: UA });
    const d = await r.json();
    const [dd, mm, yy] = String(d.fecha).slice(0, 10).split("/");
    return { valor: numAr(d.valor), fecha: `${yy}-${mm}-${dd}`, fuente: "Ámbito" };
  } catch {
    const d = await (await fetch("https://dolarapi.com/v1/dolares/bolsa")).json();
    return { valor: Math.round(((d.compra + d.venta) / 2) * 100) / 100, fecha: hoyAr(), fuente: "dolarapi (respaldo)" };
  }
}

async function actualizarMep(db: SupabaseClient) {
  const vivo = await mepVivo();
  await db.from("mep_vivo").upsert({ id: true, valor: vivo.valor, fecha: vivo.fecha, fuente: vivo.fuente, actualizado: new Date().toISOString() });

  const { count } = await db.from("mep").select("fecha", { count: "exact", head: true });
  const { data: ult } = await db.from("mep").select("fecha").order("fecha", { ascending: false }).limit(1).maybeSingle();
  // primera vez (o histórico incompleto): todo desde 2019; después, solo lo que falta
  const desde = (count ?? 0) < 1000 || !ult ? "2019-01-01"
    : iso(new Date(new Date(`${ult.fecha}T00:00:00Z`).getTime() - 7 * 86_400_000));
  const hist = await mepAmbito(desde, hoyAr());
  const filas = [...hist].map(([fecha, referencia]) => ({ fecha, referencia, fuente: "Ámbito" }));
  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await db.from("mep").upsert(filas.slice(i, i + 500), { onConflict: "fecha" });
    if (error) throw new Error(`MEP: ${error.message}`);
  }
  return { vivo, diasHistorico: filas.length };
}

// ------------------------------------------------------------------ IOL (solo GET, salvo el login)
async function iolLogin(usuario: string, clave: string): Promise<string> {
  const r = await fetch(`${IOL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: usuario, password: clave, grant_type: "password" }),
  });
  if (!r.ok) throw new Error(`IOL no aceptó el login (${r.status}). ¿Usuario/clave correctos y API habilitada en Mi Cuenta?`);
  return (await r.json()).access_token;
}

async function iolGet(token: string, path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`${IOL}${path}${q ? `?${q}` : ""}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`IOL ${path}: ${r.status}`);
  return r.json();
}

// ------------------------------------------------------------------ una hermana
async function syncHermana(db: SupabaseClient, h: { id: number; nombre: string }, mep: number) {
  const avisos: Aviso[] = [];
  const { data: cred, error: eCred } = await db.rpc("leer_credencial_iol", { p_hermana: h.id });
  if (eCred || !cred) throw new Error("No hay credencial de IOL cargada");
  const token = await iolLogin(cred.usuario, cred.clave);
  await db.from("iol_credenciales").update({ ultimo_login_ok: new Date().toISOString() }).eq("hermana_id", h.id);

  const hoy = hoyAr();
  const rango = {
    "filtro.fechaDesde": iso(new Date(Date.now() - 400 * 86_400_000)),
    "filtro.fechaHasta": iso(new Date(Date.now() + 86_400_000)),
  };
  const [est, port, ops, pend] = await Promise.all([
    iolGet(token, "/api/v2/estadocuenta"),
    iolGet(token, "/api/v2/portafolio/Argentina"),
    iolGet(token, "/api/v2/operaciones", { "filtro.estado": "terminadas", ...rango }),
    iolGet(token, "/api/v2/operaciones", { "filtro.estado": "pendientes", ...rango }),
  ]);

  // efectivo real = total - títulos valorizados
  let ars = 0, usd = 0;
  for (const c of est.cuentas ?? []) {
    const caja = Number(c.total ?? 0) - Number(c.titulosValorizados ?? 0);
    if (esUsd(c.moneda)) usd += caja; else ars += caja;
  }
  ars = Math.round(ars * 100) / 100;
  usd = Math.round(usd * 100) / 100;
  await db.from("efectivo").upsert({ hermana_id: h.id, plataforma: "IOL", ars, usd, actualizado: new Date().toISOString(), fuente: "IOL" });

  // precios de sus tickers (y alta de los que no estén en el catálogo)
  const activos = (port.activos ?? []) as Json[];
  const { data: catalogo } = await db.from("tickers").select("ticker");
  const existentes = new Set((catalogo ?? []).map((t) => t.ticker));
  const nuevosTickers: string[] = [];
  for (const a of activos) {
    const t = (a.titulo ?? {}) as Json;
    const simbolo = String(t.simbolo ?? "").toUpperCase();
    if (!simbolo) continue;
    const base = { moneda: esUsd(t.moneda) ? "USD" : "ARS", precio: Number(a.ultimoPrecio ?? 0), actualizado: new Date().toISOString(), fuente: "IOL" };
    if (existentes.has(simbolo)) {
      await db.from("tickers").update(base).eq("ticker", simbolo);
    } else {
      const cat = categoria(t);
      await db.from("tickers").insert({ ticker: simbolo, nombre: String(t.descripcion ?? simbolo), categoria_id: cat, plataforma: "IOL", cotiza_cada: cat === CAT.bonos ? 100 : 1, ...base });
      existentes.add(simbolo);
      nuevosTickers.push(simbolo);
    }
  }

  // operaciones terminadas que faltan (por número de operación)
  const { data: yaEstan } = await db.from("movimientos").select("iol_numero").not("iol_numero", "is", null);
  const ids = new Set((yaEstan ?? []).map((m) => String(m.iol_numero)));
  const nuevas: string[] = [];
  const lista = (Array.isArray(ops) ? ops : []) as Json[];
  lista.sort((a, b) => String(a.fechaOperada ?? a.fechaOrden ?? "").localeCompare(String(b.fechaOperada ?? b.fechaOrden ?? "")));
  for (const op of lista) {
    const num = String(op.numero ?? "").trim();
    const estado = String(op.estado ?? "").toLowerCase();
    if (!num || ids.has(num) || (estado && !estado.includes("terminad"))) continue;
    const tipo = tipoMov(op.tipo);
    if (!tipo) {
      avisos.push({ tipo: "operacion_sin_mapear", clave: `op_${num}`, mensaje: `${h.nombre}: la operación ${num} de tipo “${op.tipo}” no se pudo cargar sola; revisala y cargala a mano.` });
      continue;
    }
    const det = await iolGet(token, `/api/v2/operaciones/${num}`);
    const enUsd = esUsd(det.moneda);
    const comis = Number((enUsd ? det.arancelesUSD : det.arancelesARS) ?? 0);
    let monto = Number(op.montoOperado ?? op.monto ?? 0);
    if (tipo === "Compra") monto += comis;
    else if (tipo === "Venta") monto -= comis;
    const simbolo = String(op.simbolo ?? "").toUpperCase() || null;
    if (simbolo && !existentes.has(simbolo)) {
      await db.from("tickers").insert({ ticker: simbolo, nombre: simbolo, plataforma: "IOL" });
      existentes.add(simbolo);
      nuevosTickers.push(simbolo);
    }
    const cantidad = Number(op.cantidadOperada ?? op.cantidad ?? 0);
    const { error } = await db.from("movimientos").upsert({
      fecha: String(op.fechaOperada ?? op.fechaOrden ?? hoy).slice(0, 10),
      hermana_id: h.id, tipo, ticker: simbolo,
      cantidad: tipo === "Renta/Dividendo" ? null : cantidad,
      monto: Math.round(Math.max(monto, 0) * 100) / 100,
      moneda: enUsd ? "USD" : "ARS", plataforma: "IOL", origen: "IOL", iol_numero: Number(num),
      nota: `Sync IOL · ${op.tipo}${comis ? ` · incluye comisiones ${comis.toFixed(2)}` : ""}`,
    }, { onConflict: "iol_numero", ignoreDuplicates: true });
    if (error) {
      avisos.push({ tipo: "operacion_con_error", clave: `op_${num}`, mensaje: `${h.nombre}: no se pudo cargar la operación ${num} (${error.message}).` });
    } else {
      nuevas.push(`${tipo} ${simbolo ?? ""} x${cantidad}`);
      ids.add(num);
    }
  }

  // órdenes pendientes
  for (const o of (Array.isArray(pend) ? pend : []) as Json[]) {
    avisos.push({
      tipo: "orden_pendiente", clave: `orden_${o.numero}`,
      mensaje: `${h.nombre}: orden pendiente en IOL — ${o.tipo} ${o.simbolo} por ${pesos(Number(o.monto ?? 0))} (orden ${o.numero}).`,
      datos: { numero: o.numero },
    });
  }

  // control: cantidades por ticker (lo de IOL en la base vs. lo que informa IOL)
  const { data: pos } = await db.from("v_posiciones").select("ticker, cantidad, plataforma").eq("hermana_id", h.id);
  const enBase = new Map((pos ?? []).filter((p) => p.plataforma === "IOL").map((p) => [p.ticker as string, Number(p.cantidad)]));
  const enIol = new Map(activos.map((a) => [String((a.titulo as Json)?.simbolo ?? "").toUpperCase(), Number(a.cantidad ?? 0)]));
  for (const tk of new Set([...enBase.keys(), ...enIol.keys()])) {
    const dif = (enIol.get(tk) ?? 0) - (enBase.get(tk) ?? 0);
    if (Math.abs(dif) > TOL_CANT) {
      avisos.push({
        tipo: "titulos_no_cuadran", clave: `tit_${h.id}_${tk}`,
        mensaje: `${h.nombre}: ${tk} — IOL tiene ${enIol.get(tk) ?? 0} y la app ${enBase.get(tk) ?? 0}. Falta registrar ${dif > 0 ? "una compra o ingreso" : "una venta o egreso"} de ${Math.abs(dif)}.`,
        datos: { hermana_id: h.id, ticker: tk, diferencia: dif },
      });
    }
  }

  // control: efectivo en pesos (lo que surge del libro para IOL vs. el saldo real)
  const { data: movs } = await db.from("movimientos").select("tipo, monto, moneda, plataforma, aportante").eq("hermana_id", h.id);
  const signo: Record<string, number> = { "Aporte": 1, "Venta": 1, "Renta/Dividendo": 1, "Retiro": -1, "Compra": -1, "Gasto/Comisión": -1 };
  let esperado = 0;
  for (const m of movs ?? []) {
    if (m.moneda !== "ARS" || m.plataforma !== "IOL" || !(m.tipo in signo)) continue;
    if (m.tipo === "Aporte" && m.aportante === "Regalo") continue; // regalo en especie: no es plata
    esperado += signo[m.tipo] * Number(m.monto);
  }
  const { data: tol } = await db.from("reglas_alerta").select("umbral, activa").eq("tipo", "aporte_sin_registrar").maybeSingle();
  const tolerancia = Number(tol?.umbral ?? 1000);
  const difEfe = ars - esperado;
  if (tol?.activa !== false && Math.abs(difEfe) > tolerancia) {
    avisos.push(difEfe > 0
      ? {
        tipo: "aporte_sin_registrar", clave: `efe_${h.id}`,
        mensaje: `${h.nombre} tiene ${pesos(difEfe)} de efectivo que no están registrados como aporte — ¿cuándo los depositaste?`,
        datos: { hermana_id: h.id, monto: Math.round(difEfe * 100) / 100, moneda: "ARS" },
      }
      : {
        tipo: "retiro_sin_registrar", clave: `efe_${h.id}`,
        mensaje: `${h.nombre} tiene ${pesos(-difEfe)} menos de efectivo que lo que dice el libro — ¿hubo un retiro o gasto sin registrar?`,
        datos: { hermana_id: h.id, monto: Math.round(-difEfe * 100) / 100, moneda: "ARS" },
      });
  }

  // alertas: se crean/actualizan las de hoy y se dan por resueltas las que ya no aplican
  const TIPOS_SYNC = ["aporte_sin_registrar", "retiro_sin_registrar", "titulos_no_cuadran", "orden_pendiente", "operacion_sin_mapear", "operacion_con_error"];
  const claves = avisos.map((a) => a.clave);
  let q = db.from("alertas").update({ resuelta_el: new Date().toISOString() }).eq("hermana_id", h.id).in("tipo", TIPOS_SYNC).is("resuelta_el", null);
  if (claves.length) q = q.not("clave", "in", `(${claves.map((c) => `"${c}"`).join(",")})`);
  await q;
  if (avisos.length) {
    await db.from("alertas").upsert(
      avisos.map((a) => ({ hermana_id: h.id, tipo: a.tipo, clave: a.clave, mensaje: a.mensaje, datos: a.datos ?? {}, resuelta_el: null })),
      { onConflict: "clave" },
    );
  }

  // cierre del mes en curso
  const { data: res } = await db.from("v_resumen_hermana").select("total_usd").eq("hermana_id", h.id).single();
  const total = Math.round(Number(res?.total_usd ?? 0) * 100) / 100;
  await db.from("cierres").upsert({
    hermana_id: h.id, mes: `${hoy.slice(0, 7)}-01`, total_usd: total, mep_cierre: mep,
    registrado_el: new Date().toISOString(), fuente: "Sync IOL",
  });

  return { efectivo_ars: ars, efectivo_usd: usd, posiciones: activos.length, operaciones_nuevas: nuevas, tickers_nuevos: nuevosTickers, total_usd: total, avisos: avisos.map((a) => a.mensaje) };
}

// ------------------------------------------------------------------ corrida completa
async function correr(db: SupabaseClient, logId: number) {
  const resumen: Json = {};
  let fallas = 0, hermanasConCred = 0;
  try {
    const mep = await actualizarMep(db);
    resumen.mep = mep.vivo;
    resumen.mep_dias = mep.diasHistorico;
    const { data: hs } = await db.from("hermanas").select("id, nombre").order("orden");
    const { data: creds } = await db.from("iol_credenciales").select("hermana_id");
    const conCred = new Set((creds ?? []).map((c) => c.hermana_id));
    for (const h of hs ?? []) {
      if (!conCred.has(h.id)) { resumen[h.nombre] = { omitida: "sin credencial de IOL" }; continue; }
      hermanasConCred++;
      try {
        resumen[h.nombre] = await syncHermana(db, h, mep.vivo.valor);
      } catch (e) {
        fallas++;
        resumen[h.nombre] = { error: (e as Error).message };
      }
    }
    const estado = hermanasConCred === 0 ? "parcial" : fallas === 0 ? "ok" : fallas < hermanasConCred ? "parcial" : "error";
    await db.from("sync_log").update({
      fin: new Date().toISOString(), estado, resumen,
      error: hermanasConCred === 0 ? "No hay credenciales de IOL cargadas (solo se actualizó el MEP)." : fallas ? `${fallas} hermana(s) con error` : null,
    }).eq("id", logId);
  } catch (e) {
    await db.from("sync_log").update({ fin: new Date().toISOString(), estado: "error", resumen, error: (e as Error).message }).eq("id", logId);
  }
}

Deno.serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-token" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const responder = (status: number, body: Json) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // ¿quién llama?
  let disparo: "cron" | "manual";
  const tokenCron = req.headers.get("x-cron-token");
  if (tokenCron) {
    const { data: ok } = await db.rpc("verificar_token_cron", { p_token: tokenCron });
    if (!ok) return responder(401, { error: "token inválido" });
    disparo = "cron";
  } else {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await db.auth.getUser(jwt);
    if (!u?.user) return responder(401, { error: "sin sesión" });
    const { data: p } = await db.from("perfiles").select("rol").eq("user_id", u.user.id).maybeSingle();
    if (p?.rol !== "admin") return responder(403, { error: "solo el admin" });
    disparo = "manual";
  }

  // no pisar una corrida que siga en curso (se considera colgada a los 10 minutos)
  const { data: enCurso } = await db.from("sync_log").select("id").eq("estado", "corriendo")
    .gte("inicio", new Date(Date.now() - 10 * 60_000).toISOString()).limit(1).maybeSingle();
  if (enCurso) return responder(409, { error: "Ya hay una sincronización en curso", id: enCurso.id });

  const { data: log, error } = await db.from("sync_log").insert({ disparo, estado: "corriendo" }).select("id").single();
  if (error) return responder(500, { error: error.message });
  EdgeRuntime.waitUntil(correr(db, log.id));
  return responder(202, { id: log.id });
});
