# Inversiones Chicas (app)

App web que reemplaza al Excel `Inversiones Chicas v2.xlsm` (carpeta de OneDrive
`Documentos\Claude\Projects\Inversiones Hermanas`, donde están el Excel y los scripts viejos).
Carteras de largo plazo de Amparo, Rosario y Clara; las gestiona Joaquín.

## Reglas

- **Nunca comprar, vender ni transferir.** Con IOL todo es solo lectura.
- **Credenciales de IOL solo en el servidor** (Supabase Vault). Nunca en el cliente, en `NEXT_PUBLIC_*`
  ni en el repo. No hay función que las devuelva.
- **Cada hermana ve solo lo suyo**: RLS en todas las tablas (`app.es_admin()`, `app.mi_hermana()`).
  Las vistas van con `security_invoker = true`.
- **Todo se mide en USD MEP** (fuente: Ámbito, histórico + cotización en vivo). La vista en pesos es
  solo de visualización.
- **Costo cero**: Supabase free, Vercel Hobby. Avisar antes de cualquier cosa paga.
- El esquema vive en `supabase/migrations/` (se aplica con el conector de Supabase). No cambiar la base
  a mano sin dejar la migración.

## Supabase

Proyecto `inversiones-chicas` (`ebgmziwyrkcvgbfgbgke`, sa-east-1). Se guarda solo lo que se carga o
viene de afuera; posiciones, resumen, categorías y seguimiento salen de vistas `v_*` (reemplazan la
solapa `Calc` del Excel y replican sus fórmulas).

## Migración desde el Excel (hecha el 26/09/2026)

`py migracion/migrar_excel.py` y `py migracion/verificar.py` generan SQL en `migracion/salida/`
(ignorado por git: tiene datos personales). La verificación dio 139 de 139 datos iguales al Excel;
después se aplicaron los ajustes (AAPL de Rosario y Amparo = regalo de IOL; MEP de Ámbito).
No se vuelve a correr: ahora la app es la fuente de verdad.

@AGENTS.md
