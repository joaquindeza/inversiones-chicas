#!/usr/bin/env node
// Crea los usuarios de la app (una sola vez): el tuyo (admin, con email y clave) y el de cada hermana
// (PIN de 6 números). Los emails de ellas son alias del tuyo (vos+amparo@...): nunca se usan para
// escribirles, solo porque Supabase necesita un email por usuario.
//
// Uso:  npm run crear-usuarios      (lee .env.local; necesita SUPABASE_SECRET_KEY)
// Las claves se tipean ocultas y no se guardan en ningún archivo.

import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SECRET_KEY;
if (!url || !clave) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });

function preguntar(texto, { oculto = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) {
      rl._writeToOutput = (s) => {
        if (s.includes(texto)) rl.output.write(s);
        else if (s === "\r\n" || s === "\n") rl.output.write(s);
        else rl.output.write("*");
      };
    }
    rl.question(texto, (r) => { rl.close(); if (oculto) process.stdout.write("\n"); resolve(r.trim()); });
  });
}

async function pedirClave(etiqueta, valida, error) {
  for (;;) {
    const a = await preguntar(`${etiqueta}: `, { oculto: true });
    if (!valida(a)) { console.log(`  ${error}`); continue; }
    const b = await preguntar("  Repetila: ", { oculto: true });
    if (a === b) return a;
    console.log("  No coinciden, de nuevo.");
  }
}

async function crearUsuario(email, password, perfil) {
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`${email}: ${error.message}`);
  const { error: e2 } = await sb.from("perfiles").insert({ user_id: data.user.id, ...perfil });
  if (e2) throw new Error(`perfil de ${email}: ${e2.message}`);
}

const { data: perfiles, error } = await sb.from("perfiles").select("rol, hermana_id, user_id");
if (error) { console.error(error.message); process.exit(1); }
const { data: hermanas } = await sb.from("hermanas").select("id, nombre").order("orden");

// ---- admin
let emailAdmin;
const admin = perfiles.find((p) => p.rol === "admin");
if (admin) {
  emailAdmin = (await sb.auth.admin.getUserById(admin.user_id)).data.user?.email;
  console.log(`Admin ya existe (${emailAdmin}).`);
} else {
  console.log("Tu usuario (admin): entrás eligiendo “Joaquín” y esta clave.");
  emailAdmin = await preguntar("Tu email: ");
  const pass = await pedirClave("Tu clave (mínimo 10 caracteres)", (s) => s.length >= 10, "Muy corta.");
  await crearUsuario(emailAdmin, pass, { rol: "admin", hermana_id: null });
  console.log("  ✓ admin creado");
}

// ---- hermanas
const [local, dominio] = emailAdmin.split("@");
for (const h of hermanas) {
  if (perfiles.some((p) => p.hermana_id === h.id)) {
    console.log(`${h.nombre} ya tiene usuario (el PIN se cambia desde Configuración).`);
    continue;
  }
  const pin = await pedirClave(`PIN de ${h.nombre} (6 números)`, (s) => /^\d{6}$/.test(s), "Tienen que ser 6 números.");
  const alias = `${local.split("+")[0]}+${h.nombre.toLowerCase()}@${dominio}`;
  await crearUsuario(alias, pin, { rol: "hermana", hermana_id: h.id });
  console.log(`  ✓ ${h.nombre} creada`);
}
console.log("\nListo. Entrá a la app y elegí tu perfil.");
