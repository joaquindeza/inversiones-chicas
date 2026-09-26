-- Series para comparar la cartera contra alternativas (idea 6): S&P 500 (USD), Merval (ARS) y
-- tasa de plazo fijo a 30 días (% n.a., BCRA). Las escribe el sync; las lee cualquiera con sesión.
create table public.indices (
  serie text not null check (serie in ('SP500', 'MERVAL', 'PLAZO_FIJO_TNA')),
  fecha date not null,
  valor numeric not null,
  primary key (serie, fecha)
);
alter table public.indices enable row level security;
create policy lectura on public.indices for select to authenticated using (true);
create policy escritura_admin on public.indices for all to authenticated
  using ((select app.es_admin())) with check ((select app.es_admin()));
