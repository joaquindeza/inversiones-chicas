#!/usr/bin/env node
// Descarga el logo (PNG) de cada ticker del catálogo a public/logos/ y arma src/lib/logos.json
// (ticker -> archivo). Los CEDEARs usan el símbolo de la empresa en EE.UU.; las acciones argentinas,
// su ADR; las ONs, el logo del emisor. Lo que no tiene logo se muestra con las iniciales.
//
// Uso:  npm run logos      (vuelve a correrlo cuando aparezcan tickers nuevos; baja solo los que faltan)

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const FUENTE = (s) => `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(s)}.png`;

// ticker local -> símbolo con logo (si no está acá, se prueba el mismo ticker)
const EQUIVALENCIAS = {
  PAMP: "PAM", YPFD: "YPF", TXAR: "TX", BTC: "BTCUSD", ETH: "ETHUSD", SOL: "SOLUSD",
  LOC6: "LOMA",
};
// ONs: el logo del emisor según las primeras letras del ticker
const EMISORES_ON = { YM: "YPF", YC: "YPF", TL: "TGS", PN: "PAM", MG: "PAM", IRC: "IRS", LO: "LOMA", VS: "VIST", TS: "TGS" };
const SIN_LOGO = /^(GD|AL|AE|TX2|TZX|S\d|MM )/; // bonos soberanos, letras y fondos: iniciales

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SECRET_KEY;
let tickers = [];
if (url && clave) {
  const sb = createClient(url, clave, { auth: { persistSession: false } });
  const { data } = await sb.from("v_tickers").select("ticker, categoria");
  tickers = data ?? [];
} else {
  console.error("Falta .env.local con SUPABASE_SECRET_KEY");
  process.exit(1);
}

mkdirSync("public/logos", { recursive: true });
const mapa = existsSync("src/lib/logos.json") ? JSON.parse(readFileSync("src/lib/logos.json", "utf8")) : {};
let nuevos = 0;
for (const { ticker, categoria } of tickers) {
  if (mapa[ticker] || SIN_LOGO.test(ticker)) continue;
  let simbolo = EQUIVALENCIAS[ticker] ?? ticker;
  if (categoria === "Bonos / ONs") {
    const pref = Object.keys(EMISORES_ON).find((p) => ticker.startsWith(p));
    if (!pref) continue;
    simbolo = EMISORES_ON[pref];
  }
  const archivo = `${simbolo}.png`;
  if (!existsSync(`public/logos/${archivo}`)) {
    const r = await fetch(FUENTE(simbolo), { headers: { "User-Agent": "Mozilla/5.0" } });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) { console.log(`  sin logo: ${ticker} (${simbolo})`); continue; }
    writeFileSync(`public/logos/${archivo}`, Buffer.from(await r.arrayBuffer()));
    nuevos++;
  }
  mapa[ticker] = archivo;
}
writeFileSync("src/lib/logos.json", JSON.stringify(Object.fromEntries(Object.entries(mapa).sort()), null, 2) + "\n");
console.log(`Listo: ${Object.keys(mapa).length} tickers con logo (${nuevos} descargados ahora).`);
