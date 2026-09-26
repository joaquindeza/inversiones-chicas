-- Tablas de las ideas de la etapa 6.

-- Idea 2: precio de cada ticker por día (lo guarda el sync), para avisar cuando una posición se mueve
-- más de X% en el mes.
create table public.precios_hist (
  ticker    text not null references public.tickers on update cascade on delete cascade,
  fecha     date not null,
  precio_usd numeric not null,
  primary key (ticker, fecha)
);

-- Idea 2: vencimientos y pagos de cupón de ONs/bonos (se cargan a mano; avisa unos días antes).
create table public.eventos (
  id          bigint generated always as identity primary key,
  fecha       date not null,
  ticker      text references public.tickers on update cascade on delete set null,
  descripcion text not null
);

-- Idea 10: plan de aportes por hermana (monto y día del mes) para recordar y medir cumplimiento.
create table public.plan_aportes (
  hermana_id smallint primary key references public.hermanas on delete cascade,
  monto      numeric not null check (monto > 0),
  moneda     public.moneda not null default 'ARS',
  dia_mes    smallint not null default 5 check (dia_mes between 1 and 28),
  aportante  public.aportante not null default 'Joaquín',
  activo     boolean not null default true,
  desde      date not null default date_trunc('month', current_date)::date
);

alter table public.precios_hist enable row level security;
alter table public.eventos enable row level security;
alter table public.plan_aportes enable row level security;

create policy lectura on public.precios_hist for select to authenticated using (true);
create policy escritura_admin on public.precios_hist for all to authenticated
  using ((select app.es_admin())) with check ((select app.es_admin()));
create policy lectura on public.eventos for select to authenticated using (true);
create policy escritura_admin on public.eventos for all to authenticated
  using ((select app.es_admin())) with check ((select app.es_admin()));
create policy lectura on public.plan_aportes for select to authenticated
  using ((select app.es_admin()) or hermana_id = (select app.mi_hermana()));
create policy escritura_admin on public.plan_aportes for all to authenticated
  using ((select app.es_admin())) with check ((select app.es_admin()));

-- La regla de vencimientos pasa a medirse en días de anticipación.
update public.reglas_alerta set umbral = 7, nota = 'Avisar tantos días antes de un pago de cupón o vencimiento de una ON'
where tipo = 'vencimiento_on';
