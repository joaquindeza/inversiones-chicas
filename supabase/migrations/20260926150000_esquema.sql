-- Esquema base de Inversiones Chicas.
-- Se guarda solo lo que se carga a mano o viene de afuera (IOL, MEP). Todo lo calculado
-- (posiciones, resumen, seguimiento) sale de vistas: ver 20260926150200_vistas.sql.

-- ------------------------------------------------------------------ tipos
create type public.rol_usuario as enum ('admin', 'hermana');
create type public.tipo_movimiento as enum
  ('Aporte', 'Retiro', 'Compra', 'Venta', 'Renta/Dividendo', 'Gasto/Comisión', 'Ingreso de títulos');
create type public.moneda as enum ('ARS', 'USD');
create type public.aportante as enum ('Joaquín', 'Propio');
create type public.nivel_riesgo as enum ('Bajo', 'Medio', 'Alto', 'Venta');
create type public.origen_fondos as enum ('Aporte nuevo', 'Efectivo disponible');
create type public.origen_movimiento as enum ('Manual', 'IOL', 'Migración');

-- ------------------------------------------------------------------ personas y acceso
create table public.hermanas (
  id               smallint primary key,
  nombre           text not null unique,
  color            text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  fecha_nacimiento date,
  orden            smallint not null default 0
);

create table public.perfiles (
  user_id    uuid primary key references auth.users on delete cascade,
  rol        public.rol_usuario not null,
  hermana_id smallint unique references public.hermanas,
  check (rol = 'admin' or hermana_id is not null)
);

-- Solo metadatos: la clave de IOL vive en Vault (vault_secret_id) y nadie la lee de vuelta
-- salvo la Edge Function del sync (service_role).
create table public.iol_credenciales (
  hermana_id      smallint primary key references public.hermanas on delete cascade,
  vault_secret_id uuid not null,
  usuario_mascara text,
  cargada_el      timestamptz not null default now(),
  ultimo_login_ok timestamptz
);

-- Intentos de ingreso con PIN (bloqueo por fuerza bruta). Solo lo toca el servidor.
create table public.intentos_login (
  id         bigint generated always as identity primary key,
  hermana_id smallint references public.hermanas on delete cascade,
  es_admin   boolean not null default false,
  ok         boolean not null,
  ip         text,
  creado_el  timestamptz not null default now()
);
create index on public.intentos_login (hermana_id, creado_el desc);

-- ------------------------------------------------------------------ catálogos
create table public.plataformas (
  nombre text primary key,
  orden  smallint not null default 0
);

create table public.categorias (
  id           smallint primary key,
  nombre       text not null unique,
  color        text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  objetivo_pct numeric(6, 4) check (objetivo_pct between 0 and 1),
  orden        smallint not null default 0
);

create table public.tickers (
  ticker       text primary key check (ticker = upper(trim(ticker)) and ticker <> ''),
  nombre       text,
  categoria_id smallint references public.categorias,
  plataforma   text references public.plataformas on update cascade,
  moneda       public.moneda not null default 'ARS',
  precio       numeric check (precio >= 0),
  cotiza_cada  numeric not null default 1 check (cotiza_cada > 0),  -- bonos/ONs: cada 100 nominales
  actualizado  timestamptz,
  fuente       text
);

-- Dólar MEP: cierres diarios (histórico de Ámbito) y la cotización en vivo por separado,
-- igual que en el Excel (solapa MEP vs MEP_ACTUAL).
create table public.mep (
  fecha      date primary key,
  referencia numeric not null check (referencia > 0),
  compra     numeric,
  venta      numeric,
  fuente     text not null default 'Ámbito'
);

create table public.mep_vivo (
  id          boolean primary key default true check (id),
  valor       numeric not null check (valor > 0),
  fecha       date not null,
  actualizado timestamptz not null default now(),
  fuente      text not null default 'Ámbito'
);

-- ------------------------------------------------------------------ el libro
create table public.movimientos (
  id          bigint generated always as identity primary key,
  fecha       date not null,
  hermana_id  smallint not null references public.hermanas,
  tipo        public.tipo_movimiento not null,
  ticker      text references public.tickers on update cascade,
  cantidad    numeric,
  monto       numeric not null default 0 check (monto >= 0),
  moneda      public.moneda not null default 'ARS',
  tc_manual   numeric check (tc_manual > 0),
  plataforma  text not null default 'IOL' references public.plataformas on update cascade,
  aportante   public.aportante,
  nota        text,
  origen      public.origen_movimiento not null default 'Manual',
  iol_numero  bigint unique,
  creado_el   timestamptz not null default now(),
  creado_por  uuid default auth.uid() references auth.users on delete set null,
  constraint aporte_con_aportante check (tipo <> 'Aporte' or aportante is not null),
  constraint titulos_con_ticker check (
    tipo not in ('Compra', 'Venta', 'Ingreso de títulos') or (ticker is not null and cantidad > 0))
);
create index on public.movimientos (hermana_id, fecha);
create index on public.movimientos (ticker);

-- Saldo real por hermana y plataforma (lo escribe el sync para IOL; el resto a mano).
create table public.efectivo (
  hermana_id  smallint not null references public.hermanas,
  plataforma  text not null references public.plataformas on update cascade,
  ars         numeric not null default 0,
  usd         numeric not null default 0,
  actualizado timestamptz not null default now(),
  fuente      text,
  primary key (hermana_id, plataforma)
);

create table public.cierres (
  hermana_id    smallint not null references public.hermanas,
  mes           date not null check (extract(day from mes) = 1),
  total_usd     numeric not null,
  mep_cierre    numeric,
  registrado_el timestamptz not null default now(),
  fuente        text,
  primary key (hermana_id, mes)
);

-- ------------------------------------------------------------------ planificación
create table public.planes (
  id            bigint generated always as identity primary key,
  hermana_id    smallint not null references public.hermanas,
  mes           date not null check (extract(day from mes) = 1),
  capital_ars   numeric not null default 0 check (capital_ars >= 0),
  mep           numeric check (mep > 0),
  origen_fondos public.origen_fondos not null default 'Aporte nuevo',
  pct_bajo      numeric(6, 4) not null default 0 check (pct_bajo between 0 and 1),
  pct_medio     numeric(6, 4) not null default 0 check (pct_medio between 0 and 1),
  pct_alto      numeric(6, 4) not null default 0 check (pct_alto between 0 and 1),
  guardado_el   timestamptz not null default now(),
  unique (hermana_id, mes)
);

create table public.plan_items (
  id        bigint generated always as identity primary key,
  plan_id   bigint not null references public.planes on delete cascade,
  nivel     public.nivel_riesgo not null,
  ticker    text not null references public.tickers on update cascade,
  pct_nivel numeric(6, 4) check (pct_nivel between 0 and 1),
  cantidad  numeric check (cantidad > 0),
  orden     smallint not null default 0,
  check ((nivel = 'Venta') = (cantidad is not null))
);
create index on public.plan_items (plan_id);

-- ------------------------------------------------------------------ proyecciones
create table public.proyecciones (
  hermana_id     smallint primary key references public.hermanas on delete cascade,
  rend_esperado  numeric(6, 4) not null default 0.10,
  rend_pesimista numeric(6, 4) not null default 0.05,
  rend_optimista numeric(6, 4) not null default 0.15,
  edad_hasta     smallint not null default 40,
  meta_usd       numeric not null default 10000,
  meta_edad      smallint not null default 25
);

create table public.proy_tramos (
  id            bigint generated always as identity primary key,
  hermana_id    smallint not null references public.hermanas on delete cascade,
  desde_anio    smallint not null,
  hasta_anio    smallint not null,
  monto_usd_mes numeric not null check (monto_usd_mes >= 0),
  quien         public.aportante not null,
  check (hasta_anio >= desde_anio)
);

create table public.proy_gastos (
  id         bigint generated always as identity primary key,
  hermana_id smallint not null references public.hermanas on delete cascade,
  anio       smallint not null,
  concepto   text not null,
  monto_usd  numeric not null check (monto_usd >= 0)
);

-- ------------------------------------------------------------------ memoria de decisiones
create table public.tesis (
  hermana_id    smallint not null references public.hermanas on delete cascade,
  ticker        text not null references public.tickers on update cascade,
  por_que       text,
  horizonte     text,
  cuando_vender text,
  actualizado   timestamptz not null default now(),
  primary key (hermana_id, ticker)
);

-- ------------------------------------------------------------------ sync, alertas, config
create table public.sync_log (
  id      bigint generated always as identity primary key,
  inicio  timestamptz not null default now(),
  fin     timestamptz,
  disparo text not null check (disparo in ('manual', 'cron', 'migracion')),
  estado  text not null default 'corriendo' check (estado in ('corriendo', 'ok', 'parcial', 'error')),
  resumen jsonb not null default '{}',
  error   text
);

create table public.alertas (
  id          bigint generated always as identity primary key,
  hermana_id  smallint references public.hermanas on delete cascade,
  tipo        text not null,
  mensaje     text not null,
  datos       jsonb not null default '{}',
  clave       text unique,          -- para que el sync no repita la misma alerta
  creada      timestamptz not null default now(),
  resuelta_el timestamptz
);

create table public.reglas_alerta (
  tipo   text primary key,
  umbral numeric,
  activa boolean not null default true,
  nota   text
);

create table public.config (
  clave       text primary key,
  valor       jsonb not null,
  actualizado timestamptz not null default now()
);
