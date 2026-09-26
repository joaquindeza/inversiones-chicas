# Inversiones Chicas

App para seguir las carteras de inversión de Amparo, Rosario y Clara, en dólares MEP.
Next.js + Supabase (Postgres, Auth, RLS) + Vercel. Ver `CLAUDE.md` para las reglas del proyecto.

## Correr en local

1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar `SUPABASE_SECRET_KEY` (solo servidor, nunca al repo).
3. `npm run crear-usuarios` (una sola vez: crea tu usuario y el PIN de cada hermana).
4. `npm run dev` → http://localhost:3000

## Base de datos

El esquema está en `supabase/migrations/`. La migración del Excel está en `migracion/` (ya se hizo).
