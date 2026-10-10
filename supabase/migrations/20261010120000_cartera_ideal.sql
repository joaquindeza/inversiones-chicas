-- Cartera ideal: los % objetivo de cada hermana, por categoría y por ticker dentro de la categoría.
-- Va cambiando con el tiempo (gestión activa): cada cambio es una versión nueva con su fecha de
-- vigencia, y cada mes se compara contra la que regía. Reemplaza a categorias.objetivo_pct
-- (que queda sin uso).

create table public.ideales (
  id            bigint generated always as identity primary key,
  hermana_id    smallint not null references public.hermanas on delete cascade,
  vigente_desde date not null,
  guardado_el   timestamptz not null default now(),
  unique (hermana_id, vigente_desde)
);

create table public.ideal_categorias (
  ideal_id     bigint not null references public.ideales on delete cascade,
  categoria_id smallint not null references public.categorias,
  pct          numeric(6, 4) not null check (pct between 0 and 1),  -- de la cartera
  primary key (ideal_id, categoria_id)
);

create table public.ideal_items (
  ideal_id      bigint not null references public.ideales on delete cascade,
  ticker        text not null references public.tickers on update cascade,
  pct_categoria numeric(6, 4) not null check (pct_categoria between 0 and 1),  -- de su categoría
  orden         smallint not null default 0,
  primary key (ideal_id, ticker)
);

alter table public.ideales enable row level security;
alter table public.ideal_categorias enable row level security;
alter table public.ideal_items enable row level security;

create policy lectura on public.ideales for select to authenticated
  using ((select app.es_admin()) or hermana_id = (select app.mi_hermana()));
create policy escritura_admin on public.ideales for all to authenticated
  using ((select app.es_admin())) with check ((select app.es_admin()));

create policy lectura on public.ideal_categorias for select to authenticated
  using (exists (select 1 from public.ideales i where i.id = ideal_id
                 and ((select app.es_admin()) or i.hermana_id = (select app.mi_hermana()))));
create policy escritura_admin on public.ideal_categorias for all to authenticated
  using ((select app.es_admin())) with check ((select app.es_admin()));

create policy lectura on public.ideal_items for select to authenticated
  using (exists (select 1 from public.ideales i where i.id = ideal_id
                 and ((select app.es_admin()) or i.hermana_id = (select app.mi_hermana()))));
create policy escritura_admin on public.ideal_items for all to authenticated
  using ((select app.es_admin())) with check ((select app.es_admin()));

create index on public.ideal_items (ticker);

-- La ideal que rige hoy para cada hermana (la última con vigencia hasta hoy).
create view public.v_ideal_vigente with (security_invoker = true) as
select distinct on (hermana_id) id as ideal_id, hermana_id, vigente_desde
from public.ideales
where vigente_desde <= (now() at time zone 'America/Argentina/Buenos_Aires')::date
order by hermana_id, vigente_desde desc;

-- Real vs. objetivo por categoría: el objetivo ahora sale de la ideal vigente de cada hermana.
-- Mismas columnas que antes (el resto de la app y las alertas de desvío no cambian).
create or replace view public.v_categorias_hermana with (security_invoker = true) as
with cats as (
  select id, nombre, color, orden from public.categorias
  union all
  select 99::smallint, 'Otros', '#9CA3AF', 99::smallint
), pos as (
  select hermana_id, categoria, sum(valor_usd) as valor from public.v_posiciones group by 1, 2
), obj as (
  select v.hermana_id, ic.categoria_id, ic.pct
  from public.v_ideal_vigente v
  join public.ideal_categorias ic on ic.ideal_id = v.ideal_id
), v as (
  select h.id as hermana_id, c.id as categoria_id, c.nombre as categoria, c.color,
         case when exists (select 1 from public.v_ideal_vigente x where x.hermana_id = h.id)
              then coalesce(o.pct, 0) end::numeric as objetivo_pct,
         c.orden,
         coalesce(p.valor, 0) + case when c.nombre = 'Disponibilidades' then r.efectivo_usd else 0 end as valor_usd,
         r.total_usd
  from public.hermanas h
  cross join cats c
  join public.v_resumen_hermana r on r.hermana_id = h.id
  left join pos p on p.hermana_id = h.id and p.categoria = c.nombre
  left join obj o on o.hermana_id = h.id and o.categoria_id = c.id
)
select hermana_id, categoria_id, categoria, color, objetivo_pct, orden, valor_usd,
       case when total_usd <> 0 then valor_usd / total_usd end as pct,
       case when total_usd <> 0 and objetivo_pct is not null then valor_usd / total_usd - objetivo_pct end as desvio
from v;

-- Plan del mes en nominales: las compras pasan a guardar la cantidad (y el precio por nominal en
-- pesos con el que se calculó el monto). Las compras viejas, cargadas por %, siguen valiendo.
alter table public.plan_items drop constraint plan_items_check;
alter table public.plan_items add constraint plan_items_venta_con_cantidad check (nivel <> 'Venta' or cantidad is not null);
alter table public.plan_items add column precio_ars numeric check (precio_ars >= 0);

-- Momento del último precio operado que informa IOL (para mostrar "cierre del viernes").
alter table public.tickers add column precio_fecha timestamptz;

create or replace view public.v_tickers with (security_invoker = true) as
select t.ticker, t.nombre, t.categoria_id, t.plataforma, t.moneda, t.precio, t.cotiza_cada, t.actualizado, t.fuente,
       c.nombre as categoria,
       c.color as categoria_color,
       case when t.precio is null then null
            else (case when t.moneda = 'USD' then t.precio
                       else t.precio / (select valor from public.v_mep_actual) end) / t.cotiza_cada
       end as precio_usd,
       t.precio_fecha
from public.tickers t
left join public.categorias c on c.id = t.categoria_id;
